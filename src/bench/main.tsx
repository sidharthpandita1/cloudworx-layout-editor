import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './bench.css'
import { ModelBench } from './ModelBench'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModelBench />
  </StrictMode>,
)
