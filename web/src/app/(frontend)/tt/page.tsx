import { HomeView } from '../_views/HomeView'

// tt-зеркало главной (I11).
export const revalidate = 60

export default function TtHomePage() {
  return <HomeView locale="tt" />
}
