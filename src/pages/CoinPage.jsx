import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function CoinPage({ currency, formatCurrency }) {
  const { id } = useParams()
  const [coin, setCoin] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        setLoading(true)
        
        // 取得詳細資料
        const coinResponse = await api.get(
          `/coins/${id}`,
          {
            params: {
              localization: true,
              tickers: false,
              market_data: true,
              community_data: false,
              developer_data: false,
              sparkline: false,
            },
          }
        )
        setCoin(coinResponse.data)

        // 取得圖表資料
        const chartResponse = await api.get(
          `/coins/${id}/market_chart`,
          {
            params: {
              vs_currency: currency,
              days: days,
            },
          }
        )
        
        const formattedChartData = chartResponse.data.prices.map((price) => ({
          date: price[0],
          price: price[1],
        }))
        setChartData(formattedChartData)

        setError(null)
      } catch (err) {
        console.error(err)
        if (err.response && err.response.status === 429) {
          setError('請求過於頻繁，請稍後再試。')
        } else if (err.response && err.response.status === 503) {
          setError('CoinGecko 服務目前不可用，請稍後再試。')
        } else {
          setError('無法取得貨幣詳情，請稍後再試。')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCoinData()
  }, [id, currency, days])

  if (loading) return <div className="text-center py-10 text-xl">載入中...</div>
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>
  if (!coin) return null

  // 取得對應貨幣的價格
  const currentPrice = coin.market_data.current_price[currency]
  const marketCap = coin.market_data.market_cap[currency]
  const high24h = coin.market_data.high_24h[currency]
  const low24h = coin.market_data.low_24h[currency]
  const priceChange24h = coin.market_data.price_change_percentage_24h

  const description = coin.description['zh-tw'] || coin.description.zh || coin.description.en || "暫無描述"

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-6 transition">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        返回列表
      </Link>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <img src={coin.image.large} alt={coin.name} className="w-24 h-24 rounded-full shadow-sm" />
        <div className="text-center md:text-left flex-1">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {coin.name} <span className="text-gray-500 text-2xl">({coin.symbol.toUpperCase()})</span>
          </h1>
          <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(currentPrice)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${priceChange24h > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {priceChange24h > 0 ? '▲' : '▼'} {Math.abs(priceChange24h).toFixed(2)}% (24h)
            </span>
          </div>
        </div>
      </div>

      {/* 價格走勢圖 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">價格走勢 ({days} 天)</h3>
          <div className="flex gap-2">
            {[1, 7, 30, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm ${
                  days === d 
                    ? 'bg-blue-500 text-white font-bold' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d === 1 ? '24h' : d === 365 ? '1y' : `${d}d`}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px] w-full bg-gray-50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(time) => {
                  const date = new Date(time);
                  return days === 1 
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString();
                }}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => 
                  new Intl.NumberFormat('en-US', { 
                    notation: "compact", 
                    compactDisplay: "short" 
                  }).format(value)
                }
              />
              <Tooltip 
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value) => [formatCurrency(value), '價格']}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">市值</h3>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(marketCap)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">24h 最高</h3>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(high24h)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-gray-500 text-sm font-medium uppercase mb-1">24h 最低</h3>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(low24h)}</p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">關於 {coin.name}</h2>
        <div 
          className="prose max-w-none text-gray-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: description }} 
        />
      </div>
    </div>
  )
}

export default CoinPage