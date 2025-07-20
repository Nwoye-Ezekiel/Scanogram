import 'styles/index.css'
import App from './App.tsx'
import theme from './mui-theme'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>
  // </React.StrictMode>
)
