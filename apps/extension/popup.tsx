import { useState } from "react"
import "./style.css" // 暂时先加上这一行，防止报错，虽然我们还没写样式

function IndexPopup() {
  const [data, setData] = useState("")

  return (
    <div
      style={{
        padding: 16,
        minWidth: "200px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
      <h2 style={{ color: "#4724AD", marginBottom: 10 }}>
        Truth Lens 📸
      </h2>
      <p>插件启动成功！</p>
      <input
        onChange={(e) => setData(e.target.value)}
        value={data}
        placeholder="输入点什么..."
        style={{ marginTop: 10, padding: 5 }}
      />
    </div>
  )
}

export default IndexPopup