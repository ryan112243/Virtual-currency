import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Link } from 'react-router-dom'

function Home({ currency, formatCurrency }) {
  const [coins, setCoins] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoins()
    }, 500) // Debounce

    const interval = setInterval(fetchCoins, 60000) // 60 seconds
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [currency])

  const fetchCoins = async () => {
    try {
      setLoading(true)
      // 使用 api 實例，會自動根據環境加上 baseURL (Dev: /api, Prod: https://api.coingecko.com/api/v3)
      // 因此這裡只需要寫 endpoint: '/coins/markets'
      const response = await api.get(
        '/coins/markets',
        {
          params: {
            vs_currency: currency,
            order: 'market_cap_desc',
            per_page: 50,
            page: 1,
            sparkline: false,
          },
        }
      )
      setCoins(response.data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error(err)
      if (err.message === 'Network Error') {
        setError('網路連線錯誤 (Network Error)。請檢查您的網路連線，或暫時關閉廣告阻擋器 (AdBlock)。')
      } else if (err.response && err.response.status === 429) {
        setError('請求過於頻繁 (Rate Limit Exceeded)。請稍等幾分鐘後再試。')
      } else if (err.response && err.response.status === 503) {
        setError('CoinGecko 服務目前不可用 (Service Unavailable)，請稍後再試。')
      } else {
        setError('無法取得資料，請稍後再試。')
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(search.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <div>
          自動更新: 每 60 秒
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">貨幣</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">價格 ({currency.toUpperCase()})</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">24h 漲跌</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">市值</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCoins.map((coin) => (
                <tr key={coin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    #{coin.market_cap_rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/coin/${coin.id}`} className="flex items-center group">
                      <img className="h-8 w-8 rounded-full mr-3" src={coin.image} alt={coin.name} />
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition">{coin.name}</div>
                        <div className="text-sm text-gray-500 uppercase">{coin.symbol}</div>
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
