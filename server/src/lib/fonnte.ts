export async function sendFonnteMessage(target: string, message: string, token: string = ""): Promise<boolean> {
  const apiToken = token || process.env.FONNTE_TOKEN || "";
  
  if (!token) {
    console.warn("[Fonnte] FONNTE_TOKEN tidak diatur. Notifikasi WA ke", target, "dilewati.");
    return false;
  }

  if (!target) return false;

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: "62", // Default ke ID jika nomor tidak ada kode negara
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Fonnte Error] Gagal mengirim pesan ke", target, ":", errText);
      return false;
    }

    const data = await res.json();
    console.log("[Fonnte] Notifikasi berhasil dikirim ke", target, data);
    return data.status === true;
  } catch (err: any) {
    console.error("[Fonnte Catch Error] Gagal menghubungi API Fonnte:", err.message);
    return false;
  }
}
