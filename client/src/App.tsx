import { HashRouter, Routes, Route } from "react-router-dom";
import EntrySummary from "./pages/EntrySummary";
import Navbar from "./components/navbar/Navbar";
// import Footer from "./components/Footer";
import Authorisation from "./pages/Authorisation";

function App() {
  return (
    <HashRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Authorisation />} />
        <Route path="/home" element={<EntrySummary />} />
        <Route path="*" element={<Authorisation />} />
      </Routes>
      {/* <Footer /> */}
    </HashRouter>
  );
}

export default App;
