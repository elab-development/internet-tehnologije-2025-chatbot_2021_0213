import "../styles/globals.css";

import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Chatbot – Studentska služba FON</title>
      </Head>

      <Component {...pageProps} />
    </>
  );
}
