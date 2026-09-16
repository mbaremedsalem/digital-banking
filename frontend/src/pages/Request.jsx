import { useNavigate } from 'react-router-dom'
import { Stepper } from '../components/ui'
import AccountSearch from '../components/AccountSearch'
import { paymentRequests } from '../api/endpoints'

export const REQUEST_STEPS = ['Payeur', 'Montant', 'Confirmation', 'Terminé']

export default function Request() {
  const navigate = useNavigate()

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Demander un paiement</h1>
          <p>Envoyez une demande d’argent à un autre titulaire de compte PoolPay.</p>
        </div>
      </div>

      <Stepper steps={REQUEST_STEPS} current={0} />

      <AccountSearch
        searchFn={paymentRequests.searchAccount}
        cta="Demander"
        onSelect={(accountNumber) => navigate(`/request/${accountNumber}`)}
      />
    </>
  )
}
