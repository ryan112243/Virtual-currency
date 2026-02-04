import { useState, useEffect } from 'react'
import { fetchTopCoins, fetchExchangeRate } from '../utils/api'
import { Link } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

function Home({ currency, formatCurrency, watchlist, toggleWatchlist, refreshInterval, setRefreshInterval }) {
  const [coins, setCoins] = useState([])
  const [search, setSearch] = useState('')
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoins()
    }, 500) // Debounce

    let interval = null
    if (refreshInterval > 0) {
      interval = setInterval(fetchCoins, refreshInterval)
    }

    return () => {
      clearTimeout(timer)
      if (interval) clearInterval(interval)
    }
  }, [currency, refreshInterval, showWatchlistOnly])

  const fetchCoins = async () => {
    try {
      if (!currency) return 
      setLoading(true)
      
      // Fetch data from CoinGecko
      const limit = showWatchlistOnly && watchlist.length > 0 ? 100 : 50
      const coinData = await fetchTopCoins(limit)
      
      let rate = 1
      if (currency === 'twd') {
        rate = await fetchExchangeRate()
      }

      // Map CoinGecko data to app structure
      let mappedCoins = coinData.map((coin, index) => {
        return {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          current_price: coin.current_price * rate,
          market_cap: coin.market_cap * rate,
          market_cap_rank: coin.market_cap_rank,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          image: coin.image,
        }
      })

      // Filter for watchlist if needed
      if (showWatchlistOnly && watchlist.length > 0) {
        mappedCoins = mappedCoins.filter(c => watchlist.includes(c.id))
      }

      setCoins(mappedCoins)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error(err)
      setError(`無法取得資料，請稍後再試。(${err.message || '未知錯誤'})`)
    } finally {
      setLoading(false)
    }
  }

  const filteredCoins = coins.filter(coin =>
    (coin.name.toLowerCase().includes(search.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(search.toLowerCase())) &&
    (!showWatchlistOnly || watchlist.includes(coin.id))
  )

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 text-sm text-gray-500 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">自動更新:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30000}>每 30 秒</option>
              <option value={60000}>每 60 秒 (預設)</option>
              <option value={0}>關閉</option>
            </select>
            {refreshInterval === 30000 && !showWatchlistOnly && (
              <span className="text-xs text-orange-500 ml-2">
                ⚠️ 頻繁更新可能觸發 API 限制
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              showWatchlistOnly 
                ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showWatchlistOnly ? '★ 只顯示自選' : '☆ 顯示所有'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          最後更新: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
          <button
            onClick={fetchCoins}
            className="ml-2 text-blue-500 hover:text-blue-700"
            title="立即更新"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="搜尋貨幣 (例如: Bitcoin, BTC)..."
          className="w-full p-3 rounded shadow border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {loading && coins.length === 0 ? (
        <div className="text-center text-gray-500 text-xl py-10">載入中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">貨幣</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">價格 ({currency?.toUpperCase() || 'USD'})</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">24h 漲跌</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">市值</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCoins.map((coin) => (
                <tr key={coin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        toggleWatchlist(coin.id)
                      }}
                      className="text-2xl focus:outline-none transition transform active:scale-125"
                    >
                      {watchlist.includes(coin.id) ? (
                        <span className="text-yellow-400">★</span>
                      ) : (
                        <span className="text-gray-300 hover:text-gray-400">☆</span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    #{coin.market_cap_rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/coin/${coin.id}`} className="flex items-center group">
                      <img className="h-8 w-8 rounded-full mr-3" src={coin.image} alt={coin.name} />
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition">{coin?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500 uppercase">{coin?.symbol || ''}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                    {formatCurrency(coin.current_price)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${coin.price_change_percentage_24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {coin.price_change_percentage_24h?.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                    {formatCurrency(coin.market_cap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCoins.length === 0 && !loading && (
            <div className="text-center py-10 text-gray-500">
              找不到相關貨幣
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Home
