// App.jsx
import { useNasaJson } from "./useNasaJson";
import "./App.css";

export default function App() {
  const { data, err, loading } = useNasaJson("/planetary/apod", { thumbs: "true" }, 6 * 3600);

  if (loading) return <p>読み込み中…</p>;
  if (err) return <p style={{color:"crimson"}}>エラー: {err}</p>;

  const isImg = data.media_type === "image";
  const url = isImg ? (data.hdurl || data.url) : data.thumbnail_url;

  return (
    <main>
      <h1>{data.title}</h1>
      <small>{data.date}</small>
      {url && <img src={url} alt={data.title} style={{maxWidth:720, width:"100%"}} />}
      {!isImg && <p>動画はこちら 👉 <a href={data.url} target="_blank">link</a></p>}
      <p>{data.explanation}</p>
    </main>
  );
}
