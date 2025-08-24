import { createRoot } from 'react-dom/client'

function App() {
	return <div>my react app</div>
}

const root = createRoot(document.getElementById('app')!)
root.render(<App />)
