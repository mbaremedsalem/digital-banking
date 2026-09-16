import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page introuvable"
        text="Le lien que vous avez suivi n’existe pas ou a été déplacé."
        action={
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Retour au tableau de bord
          </button>
        }
      />
    </div>
  )
}
