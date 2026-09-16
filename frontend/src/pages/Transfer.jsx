import { useNavigate, useSearchParams } from 'react-router-dom'
import { Stepper } from '../components/ui'
import AccountSearch from '../components/AccountSearch'
import { transfers } from '../api/endpoints'

export const TRANSFER_STEPS = ['Bénéficiaire', 'Montant', 'Confirmation', 'Terminé']

export default function Transfer() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Transférer de l’argent</h1>
          <p>Envoyez des fonds vers un autre compte PoolPay en quatre étapes.</p>
        </div>
      </div>

      <Stepper steps={TRANSFER_STEPS} current={0} />

      <AccountSearch
        searchFn={transfers.searchAccount}
        initialQuery={params.get('q') || ''}
        onSelect={(accountNumber) => navigate(`/transfer/${accountNumber}`)}
      />
    </>
  )
}
