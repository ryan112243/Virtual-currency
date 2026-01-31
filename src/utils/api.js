import axios from 'axios'

// 根據環境決定 Base URL
// 開發環境 (Dev): 使用 '/api' (透過 Vite Proxy)
// 生產環境 (Prod/GitHub Pages): 直接使用 CoinGecko API URL
const baseURL = import.meta.env.PROD 
  ? 'https://api.coingecko.com/api/v3' 
  : '/api'

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000,
})

export default api