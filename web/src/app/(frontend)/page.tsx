import { HomeView } from './_views/HomeView'

// Главная (ru). Тело — _views/HomeView (общий для ru/tt). ISR.
export const revalidate = 60

export default function HomePage() {
  return <HomeView locale="ru" />
}
