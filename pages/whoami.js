import Image from "next/image";

import Header from "../components/Header";

export default function Whoami() {
  return (
    <>
      <Header title="Whoami" />

      <Image src="/images/portrait.jpg" height="200px" width="150px" />
      <div>Bio TBD</div>
    </>
  );
}
