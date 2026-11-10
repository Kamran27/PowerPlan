import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'

export default function Statistik() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Statistik" subtitle="Dein Fortschritt über die Zeit." />
      <Placeholder milestone="M3" text="Hier siehst du bald Punkte, Streaks und deine Tagesbilanzen." />
    </div>
  )
}
