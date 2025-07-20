export default function Splash() {
  return (
    <div>
      <div>Welcome to CrackTheCode</div>
      <div className="flex flex-col gap-5">
        <button
          onClick={() => (window.location.href = '/game')}
          className="bg-blue-500 text-white w-fit"
        >
          Go to Game
        </button>
      </div>
    </div>
  )
}
