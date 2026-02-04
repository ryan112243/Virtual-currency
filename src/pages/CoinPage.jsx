import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts'

function CoinPage({ currency, formatCurrency }) {
  const { id } = useParams()
  const [coin, setCoin] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  const timeRanges = [
    { label: '24小時', value: 1 },
    { label: '7天', value: 7 },
    { label: '30天', value: 30 },
    { label: '90天', value: 90 },
    { label: '1年', value: 365 },
    { label: '最大', value: 'max' },
  ]

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
        
        // 整合價格與交易量數據
        const prices = chartResponse.data.prices
        const volumes = chartResponse.data.total_volumes
        
        const formattedChartData = prices.map((price, index) => ({
          date: price[0],
          price: price[1],
          volume: volumes[index] ? volumes[index][1] : 0,
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
          setError('無法載入數據，請檢查網路連線。')
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
          <h3 className="text-xl font-bold text-gray-800">
            市場走勢
          </h3>
          <div className="flex space-x-2">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setDays(range.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  days === range.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[500px] w-full bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(time) => {
                  const date = new Date(time);
                  return days === 1 
                    ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    : date.toLocaleDateString();
                }}
                minTickGap={30}
                tick={{fontSize: 12}}
              />
              <YAxis 
                yAxisId="left"
                orientation="right"
                domain={['auto', 'auto']}
                tickFormatter={(value) => 
                  new Intl.NumberFormat('en-US', { notation: "compact" }).format(value)
                }
                tick={{fontSize: 12}}
              />
              <YAxis 
                yAxisId="right"
                orientation="left"
                tickFormatter={(value) => 
                  new Intl.NumberFormat('en-US', { notation: "compact" }).format(value)
                }
                tick={{fontSize: 12}}
                hide={true} // 隱藏交易量座標軸以保持整潔
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value, name) => [
                  name === 'volume' 
                    ? formatCurrency(value).replace('$', '') 
                    : formatCurrency(value),
                  name === 'volume' ? '交易量' : '價格'
                ]}
              />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                name="價格"
              />
              <Bar 
                yAxisId="right"
                dataKey="volume" 
                barSize={20} 
                fill="#cbd5e1" 
                opacity={0.5}
                name="交易量"
              />
              <Brush 
                dataKey="date" 
                height={30} 
                stroke="#8884d8"
                tickFormatter={() => ''}
                alwaysShowText={false}
              />
            </ComposedChart>
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