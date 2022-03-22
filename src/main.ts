require('dotenv').config()
import { ftx, binanceusdm } from "ccxt"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import {
    Wallet,
    initialize,
    ClearingHouse,
    ClearingHouseUser,
    PythClient
} from "@drift-labs/sdk"
import { getUSDCAmount, getMarketInfo } from "./lib"


// Discord Webhook URL
const webhookURL1 = process.env.discordWebhook1
const webhookURL2 = process.env.discordWebhook2

// ccxt FTX client
const ftxClient = new ftx({
    apiKey: process.env.ftxApiKey,
	secret: process.env.ftxSecret
})

// ccxt Binance client
const binanceClient = new binanceusdm({
    apiKey: process.env.binanceApiKey,
    secret: process.env.binanceSecret
})

// solana config
const connection = new Connection(process.env.RPCendpoint)
const pythClient= new PythClient(connection)

const keypair = Keypair.fromSecretKey(
	Uint8Array.from(JSON.parse(process.env.secretKey))
)
const wallet = new Wallet(keypair)
const sdkConfig = initialize({ env: 'mainnet-beta' })
const clearingHousePublicKey = new PublicKey(
	sdkConfig.CLEARING_HOUSE_PROGRAM_ID
)


const main = async () => {
    const clearingHouse = ClearingHouse.from(
        connection,
        wallet,
        clearingHousePublicKey
    )
    await clearingHouse.subscribe()

    const user = ClearingHouseUser.from(clearingHouse, wallet.publicKey)
	await user.subscribe()

    getUSDCAmount(webhookURL1, user, binanceClient)
    getMarketInfo(webhookURL2, clearingHouse, pythClient, binanceClient)
}


main()
