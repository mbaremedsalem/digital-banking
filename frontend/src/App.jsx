import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Loader } from './components/ui'
import Layout from './components/Layout'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transfer from './pages/Transfer'
import TransferAmount from './pages/TransferAmount'
import TransferConfirm from './pages/TransferConfirm'
import TransferDone from './pages/TransferDone'
import Request from './pages/Request'
import RequestAmount from './pages/RequestAmount'
import RequestConfirm from './pages/RequestConfirm'
import RequestDone from './pages/RequestDone'
import Requests from './pages/Requests'
import SettleRequest from './pages/SettleRequest'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Withdraw from './pages/Withdraw'
import AgharinaPay from './pages/AgharinaPay'
import Teller from './pages/Teller'
import Cards from './pages/Cards'
import CardDetail from './pages/CardDetail'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'

function Protected({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loader full label="Chargement de votre espace…" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Parcours transfert */}
        <Route path="transfer" element={<Transfer />} />
        <Route path="transfer/:accountNumber" element={<TransferAmount />} />
        <Route path="transfer/:accountNumber/:transactionId/confirm" element={<TransferConfirm />} />
        <Route path="transfer/:accountNumber/:transactionId/done" element={<TransferDone />} />

        {/* Parcours demande de paiement */}
        <Route path="request" element={<Request />} />
        <Route path="request/:accountNumber" element={<RequestAmount />} />
        <Route path="request/:accountNumber/:transactionId/confirm" element={<RequestConfirm />} />
        <Route path="request/:accountNumber/:transactionId/done" element={<RequestDone />} />

        {/* Demandes reçues / envoyées */}
        <Route path="requests" element={<Requests />} />
        <Route path="requests/:accountNumber/:transactionId/settle" element={<SettleRequest />} />

        {/* Retrait d'especes au guichet */}
        <Route path="withdraw" element={<Withdraw />} />

        {/* Services partenaires */}
        <Route path="agharina" element={<AgharinaPay />} />
        <Route path="teller" element={<Teller />} />

        <Route path="transactions" element={<Transactions />} />
        <Route path="transactions/:transactionId" element={<TransactionDetail />} />

        <Route path="cards" element={<Cards />} />
        <Route path="cards/:cardId" element={<CardDetail />} />

        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
