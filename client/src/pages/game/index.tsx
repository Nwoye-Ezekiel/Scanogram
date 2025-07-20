import { useNavigate } from 'react-router-dom'

export default function Game() {
  const navigate = useNavigate()

  return (
    <div>
      <div>CrackTheCode</div>
      <div className="flex flex-col gap-5">
        <button onClick={() => navigate('/game/create')} className="bg-blue-500 text-white w-fit">
          create private room
        </button>
        <button onClick={() => navigate('/game/join')} className="bg-blue-500 text-white w-fit">
          join private room
        </button>
        <button onClick={() => navigate('/game/public')} className="bg-blue-500 text-white w-fit">
          join public room
        </button>
      </div>
    </div>
  )
}
