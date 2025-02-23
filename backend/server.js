require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const redis = require('redis');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");  // Import alchemy-web3

const app = express();
app.use(cors());
app.use(express.json());

const MONAD_API = process.env.MONAD_API;  // API Monad Testnet
const ALCHEMY_RPC = process.env.ALCHEMY_RPC;  // Monad Testnet RPC URL
const PORT = process.env.PORT || 5000;

// Kết nối Redis
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect().catch(console.error);

// Kết nối Alchemy Web3
const web3 = createAlchemyWeb3(ALCHEMY_RPC);  // Sử dụng Alchemy RPC URL

// Middleware kiểm tra cache
const checkCache = async (req, res, next) => {
    const key = req.originalUrl; // Sử dụng URL làm key cache
    const cachedData = await client.get(key);

    if (cachedData) {
        console.log(`⚡ Cache hit: ${key}`);
        return res.json(JSON.parse(cachedData));
    }

    console.log(`🟠 Cache miss: ${key}`);
    next();
};

// API lấy token (có cache)
app.get('/tokens/:address', checkCache, async (req, res) => {
    try {
        const { address } = req.params;
        const response = await axios.get(`${MONAD_API}/account/tokenPortfolio?address=${address}`);
        const tokens = response.data.result.data || [];

        // Lưu vào cache trong 5 phút
        await client.setEx(req.originalUrl, 300, JSON.stringify(tokens));

        res.json(tokens);
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Lỗi khi lấy dữ liệu token' });
    }
});

// API lấy NFT (có cache)
app.get('/nfts/:address', checkCache, async (req, res) => {
    try {
        const { address } = req.params;
        const response = await axios.get(`${MONAD_API}/account/nfts?address=${address}`);
        const nfts = response.data.result.data || [];

        const nftList = nfts.map(nft => ({
            name: nft.name || "Unknown NFT",
            tokenIds: nft.items ? nft.items.map(item => item.tokenId) : []
        }));

        // Lưu vào cache trong 5 phút
        await client.setEx(req.originalUrl, 300, JSON.stringify(nftList));

        res.json(nftList);
    } catch (error) {
        console.error('Error fetching NFTs:', error);
        res.status(500).json({ error: 'Lỗi khi lấy dữ liệu NFT' });
    }
});

// API lấy số lần tương tác hợp đồng (có cache)
app.get('/contract-interactions/:address', checkCache, async (req, res) => {
    try {
        const { address } = req.params;
        const response = await axios.get(`${MONAD_API}/account/transactions?address=${address}`);
        const activities = response.data.result.data || [];
        const uniqueContracts = new Set(activities.map(tx => tx.to).filter(Boolean));

        const result = { count: uniqueContracts.size };

        // Lưu vào cache trong 5 phút
        await client.setEx(req.originalUrl, 300, JSON.stringify(result));

        res.json(result);
    } catch (error) {
        console.error('Error fetching contract interactions:', error);
        res.status(500).json({ error: 'Lỗi khi lấy dữ liệu hợp đồng' });
    }
});

// API lấy số lần giao dịch từ Alchemy (Chỉ Monad Testnet)
app.get('/transaction-count/:address', checkCache, async (req, res) => {
    try {
        const { address } = req.params;

        // Lấy số lần giao dịch từ Alchemy thông qua Web3
        const transactionCount = await web3.eth.getTransactionCount(address, "latest");

        // Kiểm tra kết quả
        console.log(`Transaction Count for ${address}: ${transactionCount}`);

        res.json({ count: transactionCount });
    } catch (error) {
        console.error('Error fetching transaction count from Alchemy:', error.message);
        res.status(500).json({ error: 'Lỗi khi lấy số lần giao dịch từ Alchemy', details: error.message });
    }
});

app.listen(PORT, () => console.log(`✅ Server chạy trên cổng ${PORT}`));
