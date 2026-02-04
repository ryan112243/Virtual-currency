import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchCoinDetails, fetchCoinHistory, fetchExchangeRate } from '../utils/api'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function CoinPage({ currency = 'usd', formatCurrency, watchlist, toggleWatchlist, refreshInterval }) {
  const { id } = useParams()
  const [coin, setCoin] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [range, setRange] = useState('1')

  const timeRanges = [
    { label: '24小時', value: '1', interval: '5m' },
    { label: '7天', value: '7', interval: 'hourly' },
    { label: '14天', value: '14', interval: 'daily' },
    { label: '30天', value: '30', interval: 'daily' },
    { label: '90天', value: '90', interval: 'daily' },
    { label: '1年', value: '365', interval: 'daily' },
    { label: '最大', value: 'max', interval: 'daily' },
  ]

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        if (!coin) setLoading(true)
        
        const selectedRange = timeRanges.find(r => r.value === range) || timeRanges[0]
        
        const coinData = await fetchCoinDetails(id);
        
        if (!coinData) {
          throw new Error('No data received')
        }

        const historyData = await fetchCoinHistory(coinData.symbol, selectedRange.value);
        
        let rate = 1
        if (currency === 'twd') {
          rate = await fetchExchangeRate()
        }

        if (!coinData) {
          throw new Error('No data received')
        }

        // Construct coin object
        setCoin({
          id: coinData.id,
          name: coinData.name,
          symbol: coinData.symbol,
          image: { large: coinData.image?.large },
          market_data: {
            current_price: { [currency]: (coinData.market_data?.current_price?.usd || 0) * rate },
            market_cap: { [currency]: (coinData.market_data?.market_cap?.usd || 0) * rate },
            volume_24h: { [currency]: (coinData.market_data?.total_volume?.usd || 0) * rate },
            price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h || 0,
            supply: coinData.market_data?.circulating_supply || 0,
            max_supply: coinData.market_data?.max_supply || 0
          },
          description: { 'zh-tw': coinData.description?.['zh-tw'] || coinData.description?.en || '暫無描述' }
        })

        // Process chart data
        if (historyData && Array.isArray(historyData)) {
          const formattedChartData = historyData.map(item => ({
            date: item[0], // Timestamp
            price: item[1] * rate // Price
          }))
          setChartData(formattedChartData)
        }
        
        setError(null)
      } catch (err) {
        console.error(err)
        setError('無法載入數據，請檢查網路連線或稍後再試。')
      } finally {
        setLoading(false)
      }
    }

    fetchCoinData()

    let interval = null
    if (refreshInterval > 0) {
      interval = setInterval(fetchCoinData, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [id, currency, range, refreshInterval])

  if (loading) return <div className="text-center py-10 text-xl">載入中...</div>
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>
  if (!coin) return null

  // Helper for safe access
  const safeCurrency = currency || 'usd'
  const currentPrice = coin.market_data?.current_price?.[safeCurrency] || 0
  const priceChange24h = coin.market_data?.price_change_percentage_24h || 0
  
  // Display stats
  const stats = [
    { label: '市值', value: formatCurrency(coin.market_data?.market_cap?.[safeCurrency]) },
    { label: '24h 交易量', value: formatCurrency(coin.market_data?.volume_24h?.[safeCurrency]) },
    { label: '流通供給量', value: `${parseInt(coin.market_data?.supply).toLocaleString()} ${coin.symbol}` },
    { label: '最大供給量', value: coin.market_data?.max_supply ? `${parseInt(coin.market_data?.max_supply).toLocaleString()} ${coin.symbol}` : '無上限' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="inline-flex items-center text-blue-500 hover:text-blue-700 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回列表
        </Link>
        <button
          onClick={() => toggleWatchlist(coin.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition border ${
            watchlist.includes(coin.id)
              ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-xl">{watchlist.includes(coin.id) ? '★' : '☆'}</span>
          <span className="font-medium">{watchlist.includes(coin.id) ? '已加入自選' : '加入自選'}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <img src={coin.image.large} alt={coin.name} className="w-24 h-24 rounded-full shadow-sm" />
        <div className="text-center md:text-left flex-1">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {coin.name} <span className="text-gray-500 text-2xl">({coin.symbol?.toUpperCase() || ''})</span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
            <div className="font-semibold text-gray-800">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 價格走勢圖 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            市場走勢
          </h3>
          <div className="flex space-x-2">
            {timeRanges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  range === r.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[500px] w-full bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(tick) => {
                  const date = new Date(tick);
                  return range === '1' 
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString();
                }}
                stroke="#9ca3af"
                fontSize={12}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(tick) => formatCurrency(tick)} // Simplified formatter
                stroke="#9ca3af"
                fontSize={12}
                width={80}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), '價格']}
                labelFormatter={(label) => new Date(label).toLocaleString()}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#2563eb" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default CoinPage
