import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CoinPage from './pages/CoinPage'

function App() {
  const [currency, setCurrency] = useState('usd') // 'usd' or 'twd'
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('watchlist')
    return saved ? JSON.parse(saved) : []
  })
  const [refreshInterval, setRefreshInterval] = useState(60000) // Default 60s

  const toggleWatchlist = (coinId) => {
    setWatchlist(prev => {
      const newWatchlist = prev.includes(coinId)
        ? prev.filter(id => id !== coinId)
        : [...prev, coinId]
      localStorage.setItem('watchlist', JSON.stringify(newWatchlist))
      return newWatchlist
    })
  }

  const formatCurrency = (value) => {
    const curr = currency || 'usd'
    return new Intl.NumberFormat(curr === 'twd' ? 'zh-TW' : 'en-US', {
      style: 'currency',
      currency: curr.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">
            虛擬貨幣即時價格
          </h1>
          
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-lg shadow p-1 flex">
              <button
                onClick={() => setCurrency('usd')}
                className={`px-4 py-2 rounded-md transition ${
                  currency === 'usd' 
                    ? 'bg-blue-500 text-white font-bold' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                USD 美元
              </button>
              <button
                onClick={() => setCurrency('twd')}
                className={`px-4 py-2 rounded-md transition ${
                  currency === 'twd' 
                    ? 'bg-blue-500 text-white font-bold' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                TWD 台幣
              </button>
            </div>
          </div>
        </div>

        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                currency={currency || 'usd'} 
                formatCurrency={formatCurrency}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                refreshInterval={refreshInterval}
                setRefreshInterval={setRefreshInterval}
              />
            } 
          />
          <Route 
            path="/coin/:id" 
            element={
              <CoinPage 
                currency={currency || 'usd'} 
                formatCurrency={formatCurrency}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                refreshInterval={refreshInterval}
              />
            } 
          />
        </Routes>
      </div>
    </div>
  )
}

export default App
