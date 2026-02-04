
import axios from 'axios'

// CoinPaprika API (For Market Data & Details)
const paprikaApi = axios.create({
  baseURL: 'https://api.coinpaprika.com/v1',
  timeout: 15000,
  headers: { 'Accept': 'application/json' }
})

// CryptoCompare API (For Historical Charts)
const cryptoCompareApi = axios.create({
  baseURL: 'https://min-api.cryptocompare.com/data/v2',
  timeout: 15000
})

// In-memory cache
const cache = {
  topCoins: { data: null, timestamp: 0 },
  coinDetails: {}, // { id: { data, timestamp } }
  coinHistory: {}, // { symbol_days: { data, timestamp } }
  exchangeRate: { data: null, timestamp: 0 }
}

const CACHE_DURATION = 60000 // 1 minute
const HISTORY_CACHE_DURATION = 5 * 60000 // 5 minutes

// Helper to construct image URL
const getCoinImage = (id) => {
  if (!id) return '';
  return `https://static.coinpaprika.com/coin/${id}/logo.png`;
}

// Retry logic
const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      // console.warn(`API call failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchWithRetry(fn, retries - 1, delay * 2)
    }
    throw error
  }
}

// Fetch top coins (Market Data)
export const fetchTopCoins = async (limit = 50, page = 1) => {
  const cacheKey = `top_${limit}_${page}`
  const now = Date.now()
  
  if (cache.topCoins.data && (now - cache.topCoins.timestamp < CACHE_DURATION)) {
    return cache.topCoins.data.slice((page - 1) * limit, page * limit)
  }

  try {
    const response = await fetchWithRetry(() => paprikaApi.get('/tickers'));
    
    const sortedData = response.data
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 100);

    const mappedData = sortedData.map(coin => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol, // Important: "BTC", "ETH"
      current_price: coin.quotes.USD.price,
      market_cap: coin.quotes.USD.market_cap,
      market_cap_rank: coin.rank,
      price_change_percentage_24h: coin.quotes.USD.percent_change_24h,
      total_volume: coin.quotes.USD.volume_24h,
      image: getCoinImage(coin.id)
    }));
    
    cache.topCoins = { data: mappedData, timestamp: now }
    return mappedData.slice((page - 1) * limit, page * limit)
  } catch (error) {
    console.error('CoinPaprika API Error (Top Coins):', error)
    if (cache.topCoins.data) return cache.topCoins.data.slice((page - 1) * limit, page * limit)
    throw error
  }
}

// Fetch coin details
export const fetchCoinDetails = async (id) => {
  const now = Date.now()
  if (cache.coinDetails[id] && (now - cache.coinDetails[id].timestamp < CACHE_DURATION)) {
    return cache.coinDetails[id].data
  }

  try {
    const [coinRes, tickerRes] = await Promise.all([
      fetchWithRetry(() => paprikaApi.get(`/coins/${id}`)),
      fetchWithRetry(() => paprikaApi.get(`/tickers/${id}`))
    ]);

    const coinData = coinRes.data;
    const tickerData = tickerRes.data;

    const mappedData = {
      id: coinData.id,
      name: coinData.name,
      symbol: coinData.symbol, // "BTC"
      image: { large: getCoinImage(coinData.id) },
      description: { 
        en: coinData.description,
        'zh-tw': coinData.description 
      },
      market_data: {
        current_price: { usd: tickerData.quotes.USD.price },
        market_cap: { usd: tickerData.quotes.USD.market_cap },
        total_volume: { usd: tickerData.quotes.USD.volume_24h },
        price_change_percentage_24h: tickerData.quotes.USD.percent_change_24h,
        circulating_supply: tickerData.circulating_supply,
        max_supply: tickerData.max_supply
      }
    };

    cache.coinDetails[id] = { data: mappedData, timestamp: now }
    return mappedData
  } catch (error) {
    console.error('CoinPaprika API Error (Details):', error)
    if (cache.coinDetails[id]) return cache.coinDetails[id].data
    throw error
  }
}

// Fetch coin history (Using CryptoCompare)
// NOTE: This function now expects 'symbol' (e.g. 'BTC') instead of 'id' (e.g. 'btc-bitcoin')
// But for backward compatibility with existing calls that might pass ID, we should handle it or ensure caller passes symbol.
// We will update CoinPage.jsx to pass symbol.
export const fetchCoinHistory = async (symbol, days) => {
  if (!symbol) return [];
  // Clean symbol just in case (uppercase)
  const fsym = symbol.toUpperCase();
  
  const cacheKey = `${fsym}_${days}`
  const now = Date.now()
  if (cache.coinHistory[cacheKey] && (now - cache.coinHistory[cacheKey].timestamp < HISTORY_CACHE_DURATION)) {
    return cache.coinHistory[cacheKey].data
  }

  try {
    let endpoint = '/histohour';
    let limit = 24;
    let aggregate = 1;

    if (days === '1') {
      endpoint = '/histominute';
      limit = 144; // 10 min intervals? Default is 1 min. 1440 min = 24h.
      // CryptoCompare histominute limit 2000. 
      // Let's request 144 points (10 min) to save bandwidth/rendering? 
      // Or just 1h for consistency?
      // Sparklines look better with more data. 
      // Let's use histohour for 24h (24 points) - it's fast and reliable.
      // Or histominute with aggregate=10 (10 mins) -> 144 points.
      endpoint = '/histominute';
      limit = 144;
      aggregate = 10;
    } else if (days === '7') {
      endpoint = '/histohour';
      limit = 168; // 7 * 24
    } else if (days === '14') {
      endpoint = '/histohour';
      limit = 336;
    } else if (days === '30') {
      endpoint = '/histohour';
      limit = 720;
    } else {
      endpoint = '/histoday';
      limit = days === 'max' ? 365 : parseInt(days);
    }

    const response = await fetchWithRetry(() => cryptoCompareApi.get(endpoint, {
      params: {
        fsym: fsym,
        tsym: 'USD',
        limit: limit,
        aggregate: aggregate
      }
    }));

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    const historyData = response.data.Data.Data;
    
    // Map to [[timestamp, price], ...]
    const mappedHistory = historyData.map(item => [
      item.time * 1000,
      item.close
    ]);

    cache.coinHistory[cacheKey] = { data: mappedHistory, timestamp: now }
    return mappedHistory
  } catch (error) {
    console.error('CryptoCompare API Error (History):', error)
    if (cache.coinHistory[cacheKey]) return cache.coinHistory[cacheKey].data
    return []
  }
}

// Fetch Exchange Rate (USD to TWD)
export const fetchExchangeRate = async () => {
  const now = Date.now()
  if (cache.exchangeRate.data && (now - cache.exchangeRate.timestamp < 3600000)) {
    return cache.exchangeRate.data
  }

  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD')
    const rate = response.data.rates.TWD
    cache.exchangeRate = { data: rate, timestamp: now }
    return rate
  } catch (error) {
    console.error('Exchange Rate API Error:', error)
    return 31.5
  }
}
