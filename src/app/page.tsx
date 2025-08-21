
import LoginPage from './login/page';

export default function Home() {
  // Render the login page directly to avoid redirection issues on startup
  return <LoginPage />;
}
