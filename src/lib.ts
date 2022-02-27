require('dotenv').config()
import axios from 'axios'
import { ftx } from "ccxt"
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


export const getUSDCAmount = async (URL: string, user: ClearingHouseUser, client: ftx) => {
    while (true) {
		while (true) {
			try {
				let balance = await client.fetchBalance()
				let FTXUSDCAmount = Math.round(balance['USD']['total'] * 100) / 100

				let collateral = user.getTotalCollateral()
				let driftUSDCAmount = Math.round(convertToNumber(collateral, QUOTE_PRECISION) * 100) / 100
				
                let USDCAmount = Math.round((FTXUSDCAmount + driftUSDCAmount) * 100) / 100

				let postData = {
					username: '残高通知bot',
                    embeds: [
                        {
                            fields: [
                                {
                                    name: "FTX",
                                    value: String(FTXUSDCAmount) + ' USD',
                                    inline: true
                                },
                                {
                                    name: "Drift",
                                    value: String(driftUSDCAmount) + ' USD',
                                    inline: true
                                },
                                {
                                    name: "Sum",
                                    value: String(USDCAmount) + ' USD',
                                    inline: true
                                }
                            ]
                        }
                    ]
				}

				await axios.post(URL, postData)
				break
			} catch (e) {
				console.log(e)
			}
		}

        await sleep(450000)
    }
}


export const getMarketInfo = async (URL: string, clearingHouse: ClearingHouse, pythClient: PythClient, client: ftx) => {
	const tokenLists = [
		['SOL', 'LUNA', 'AVAX', 'MATIC', 'ATOM'],
		['DOT', 'ADA', 'ALGO', 'FTT', 'LTC'],
	]

	while (true) {
		while (true) {
			try {
				for (let tokenList of tokenLists) {
					let fields: Fields[] = new Array(0)

					for (let token of tokenList) {
						let symbol = token + '-PERP'
						let market = Markets.find((market) => market.baseAssetSymbol === token)
						let marketAccount = clearingHouse.getMarket(market.marketIndex)
				
						let tmpFundingRateDrift = convertToNumber(
							await calculateEstimatedFundingRate(marketAccount, await pythClient.getPriceData(marketAccount.amm.oracle), new BN(1), "interpolated")
						)
						let fundingRateDrift = Math.round(tmpFundingRateDrift * 10000) / 10000
				
						let info = await client.fetchFundingRate(symbol)
						let fundingRateFTX = Math.round(100 * info.fundingRate * 10000) / 10000
				
						let tmpFeePool = convertToNumber(marketAccount.amm.totalFeeMinusDistributions, QUOTE_PRECISION)
							- convertToNumber(marketAccount.amm.totalFee, QUOTE_PRECISION) / 2
						let feePool = Math.round(tmpFeePool * 100) / 100
				
						fields.push({
							name: 'Drift',
							value: String(fundingRateDrift) + '%',
							inline: true
						})
				
						fields.push({
							name: 'FTX',
							value: String(fundingRateFTX) + '%',
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
