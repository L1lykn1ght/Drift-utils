require('dotenv').config()
import axios from 'axios'
import { binanceusdm, ftx } from "ccxt"
import {
	BN,
	ClearingHouse,
	ClearingHouseUser,
	PythClient,
	Markets,
	convertToNumber,
	calculateEstimatedFundingRate,
	QUOTE_PRECISION
} from '@drift-labs/sdk'


// func sleep
const sleep = async (ms: number) => {
    return new Promise(r => setTimeout(r, ms))
}


interface Fields {
	name: string,
	value: string,
	inline?: boolean
}


export const getUSDCAmount = async (URL: string, user: ClearingHouseUser, client: ftx | binanceusdm) => {
    while (true) {
		while (true) {
			try {
				let balance = await client.fetchBalance()
				let cexUsdcAmount: number

				switch (client.name) {
					case 'FTX':
						cexUsdcAmount = Math.round(balance['USD']['total'] * 100) / 100
						break
					case 'Binance USDⓈ-M':
						cexUsdcAmount = Math.round(balance['USDT']['total'] * 100) / 100
						break
				}

				let collateral = user.getTotalCollateral()
				let driftUsdcAmount = Math.round(convertToNumber(collateral, QUOTE_PRECISION) * 100) / 100
				
                let usdcAmount = Math.round((cexUsdcAmount + driftUsdcAmount) * 100) / 100

				let postData = {
					username: '残高通知bot',
                    embeds: [
                        {
                            fields: [
                                {
                                    name: "CEX",
                                    value: String(cexUsdcAmount) + ' USD',
                                    inline: true
                                },
                                {
                                    name: "Drift",
                                    value: String(driftUsdcAmount) + ' USD',
                                    inline: true
                                },
                                {
                                    name: "Sum",
                                    value: String(usdcAmount) + ' USD',
                                    inline: true
                                }
                            ]
                        }
                    ]
				}

				await axios.post(URL, postData)
				break
			} catch (e) { console.log(e) }
		}

        await sleep(450000)
    }
}


export const getMarketInfo = async (URL: string, clearingHouse: ClearingHouse, pythClient: PythClient, client: ftx | binanceusdm) => {
	let tokenLists: any
	
	switch (client.name) {
		case 'FTX':
			tokenLists = [
				['SOL', 'LUNA', 'AVAX', 'MATIC', 'ATOM'],
				['DOT', 'ADA', 'ALGO', 'FTT', 'LTC'],
			]
			break
		case 'Binance USDⓈ-M':
			tokenLists = [
				['SOL', 'LUNA', 'AVAX', 'MATIC', 'ATOM'],
				['DOT', 'ADA', 'ALGO', 'LTC'],
			]
			break
	}

	while (true) {
		while (true) {
			try {
				for (let tokenList of tokenLists) {
					let fields: Fields[] = new Array(0)

					for (let token of tokenList) {
						let symbol: string

						switch (client.name) {
							case 'FTX':
								symbol = token + '-PERP'
								break
							case 'Binance USDⓈ-M':
								symbol = token + 'USDT'
								break
						}

						let info = await client.fetchFundingRate(symbol)
						let cexFundingRate = Math.round(100 * info.fundingRate * 10000) / 10000

						let market = Markets.find((market) => market.baseAssetSymbol === token)
						let marketAccount = clearingHouse.getMarket(market.marketIndex)
				
						let tmpFundingRateDrift = convertToNumber(
							await calculateEstimatedFundingRate(marketAccount, await pythClient.getOraclePriceData(marketAccount.amm.oracle), new BN(1), "interpolated")
						)
						let driftFundingRate = Math.round(tmpFundingRateDrift * 10000) / 10000
				
						let tmpFeePool = convertToNumber(marketAccount.amm.totalFeeMinusDistributions, QUOTE_PRECISION)
							- convertToNumber(marketAccount.amm.totalFee, QUOTE_PRECISION) / 2
						let feePool = Math.round(tmpFeePool * 100) / 100

						fields.push({
							name: 'CEX',
							value: String(cexFundingRate) + '%',
							inline: true
						})
				
						fields.push({
							name: token + ' Drift',
							value: String(driftFundingRate) + '%',
							inline: true
						})
				
						fields.push({
							name: 'Fee Pool',
							value: String(feePool) + ' USD',
							inline: true
						})
					}
				
					let postData = {
						username: 'Market Info',
						embeds: [{fields}]
					}
				
					await axios.post(URL, postData)
				}

				break
			} catch (e) {
				console.log(e)
			}
		}

		await sleep(1800000)
	}
}
