import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { motion } from 'framer-motion';
import './App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState({ tokens: false, nfts: false });
  const [frogPosition, setFrogPosition] = useState({ x: 0, y: 0 });

  const web3 = new Web3();

  const isValidEvmAddress = (address) => web3.utils.isAddress(address);

  const fetchWalletInfo = async (address) => {
    setLoading(true);
    setError('');
    if (!isValidEvmAddress(address)) {
      setError('Địa chỉ ví không hợp lệ!');
      setLoading(false);
      return;
    }

    try {
      const [tokens, nfts, contractInteractions, transactionCount] = await Promise.all([
        axios.get(`http://localhost:5000/tokens/${address}`),
        axios.get(`http://localhost:5000/nfts/${address}`),
        axios.get(`http://localhost:5000/contract-interactions/${address}`),
        axios.get(`http://localhost:5000/transaction-count/${address}`) // Thêm API lấy số lần giao dịch
      ]);

      setWalletInfo({
        tokenCount: tokens.data.length,
        nftCount: nfts.data.length,
        tokens: tokens.data,
        nfts: nfts.data,
        contractInteractions: contractInteractions.data.count,
        transactionCount: transactionCount.data.count // Dữ liệu số lần giao dịch
      });
    } catch (err) {
      setError('Lỗi khi lấy dữ liệu!');
    }
    setLoading(false);
  };

  // Di chuyển con ếch ngẫu nhiên
  useEffect(() => {
    const moveFrogRandomly = () => {
      const maxX = window.innerWidth - 60; // Trừ đi kích thước con ếch
      const maxY = window.innerHeight - 60;
      const newX = Math.random() * maxX;
      const newY = Math.random() * maxY;
      setFrogPosition({ x: newX, y: newY });
    };

    const intervalId = setInterval(moveFrogRandomly, 2000); // Di chuyển mỗi 2 giây

    return () => clearInterval(intervalId); // Dọn dẹp interval khi component unmount
  }, []);

  return (
    <div className="App">
      <div
        className="frog"
        style={{
          transform: `translate(${frogPosition.x}px, ${frogPosition.y}px)`,
        }}
      ></div>

      <header className="App-header">
        <h1>Monad Wallet Checker</h1>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Nhập địa chỉ ví EVM"
        />
        <button onClick={() => fetchWalletInfo(walletAddress)} disabled={loading}>
          {loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
        </button>

        {error && <p className="error">{error}</p>}

        {walletInfo && (
          <div className="wallet-info">
            <p onClick={() => setShowDetails({ ...showDetails, tokens: !showDetails.tokens })}>
              <strong>Số token:</strong> {walletInfo.tokenCount}
            </p>
            {showDetails.tokens && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.5 }}
                className="details-box"
              >
                {walletInfo.tokens.map((t) => (
                  <div key={t.symbol}>{t.name} ({t.symbol})</div>
                ))}
              </motion.div>
            )}

            <p onClick={() => setShowDetails({ ...showDetails, nfts: !showDetails.nfts })}>
              <strong>Số NFT:</strong> {walletInfo.nftCount}
            </p>
            {showDetails.nfts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.5 }}
                className="details-box"
              >
                {walletInfo.nfts.map((n, index) => (
                  <div key={index}>
                    {n.name} (ID: {n.tokenIds.join(', ')})
                  </div>
                ))}
              </motion.div>
            )}
            <p><strong>Số lần tương tác hợp đồng:</strong> {walletInfo.contractInteractions}</p>

            {/* Hiển thị số lần giao dịch */}
            <p><strong>Số lần giao dịch:</strong> {walletInfo.transactionCount}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
