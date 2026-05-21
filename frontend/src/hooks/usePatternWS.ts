import { useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";

export type WSStatus = 
  | "IDLE" 
  | "CONNECTING" 
  | "UPLOADING" 
  | "ANALYZING" 
  | "CALIBRATING" 
  | "GENERATING" 
  | "COMPLETED" 
  | "ERROR";

export interface WSProgressPayload {
  step: "upload" | "analyzing" | "calibration" | "generation" | "completed" | "error";
  message: string;
  data?: any;
}

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// HTTP URL'sini WebSocket URL'sine çeviren yardımcı fonksiyon
const getWSUrl = () => {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (API.startsWith("http://") || API.startsWith("https://")) {
    const parsed = new URL(API);
    return `${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}/api/patterns/generate-ws`;
  }
  // Eğer sadece domain verilmişse
  return `${wsProtocol}//${window.location.host}/api/patterns/generate-ws`;
};

export interface UsePatternWSOptions {
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export function usePatternWS(options?: UsePatternWSOptions) {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<WSStatus>("IDLE");
  const statusRef = useRef<WSStatus>("IDLE");
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  const setStatusWithRef = useCallback((newStatus: WSStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  const cleanUp = useCallback(() => {
    if (socketRef.current) {
      // Planlı kapatmalarda event handler'ları temizle
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;
      
      if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  }, []);

  const generatePatternWS = useCallback(async (file: File | Blob, refObjectType: string = "a4") => {
    if (!token) {
      setError("Oturum açmanız gerekmektedir.");
      if (options?.onError) options.onError("Oturum açmanız gerekmektedir.");
      setStatusWithRef("ERROR");
      return;
    }

    cleanUp();
    setStatusWithRef("CONNECTING");
    setProgressMessage("Güvenli WebSocket bağlantısı kuruluyor...");
    setError("");
    setResult(null);

    // Dosyayı base64 formatına çevir
    const fileToBase64 = (f: File | Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Görsel dönüştürülemedi."));
          }
        };
        reader.onerror = (err) => reject(err);
      });
    };

    try {
      setStatusWithRef("UPLOADING");
      setProgressMessage("Görsel hazırlanıyor...");
      const base64Image = await fileToBase64(file);

      // WebSocket URL'sini belirle ve token'ı query parametresi olarak ekle
      const wsUrl = `${getWSUrl()}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatusWithRef("ANALYZING");
        setProgressMessage("Bağlantı kuruldu, veri paketi gönderiliyor...");
        
        // İlk el sıkışmada görseli ve parametreleri gönder
        ws.send(JSON.stringify({
          image: base64Image,
          ref_object_type: refObjectType
        }));
      };

      ws.onmessage = (event) => {
        try {
          const payload: WSProgressPayload = JSON.parse(event.data);
          
          if (payload.step === "analyzing") {
            setStatusWithRef("ANALYZING");
            setProgressMessage(payload.message || "Görsel analiz ediliyor...");
          } else if (payload.step === "calibration") {
            setStatusWithRef("CALIBRATING");
            setProgressMessage(payload.message || "Referans kalibrasyonu yapılıyor...");
          } else if (payload.step === "generation") {
            setStatusWithRef("GENERATING");
            setProgressMessage(payload.message || "Kalıp sınırları ve dikiş payları üretiliyor...");
          } else if (payload.step === "completed") {
            setStatusWithRef("COMPLETED");
            setProgressMessage("Kalıp başarıyla üretildi!");
            setResult(payload.data);
            if (options?.onComplete) options.onComplete(payload.data);
            cleanUp();
          } else if (payload.step === "error") {
            setStatusWithRef("ERROR");
            setError(payload.message || "Kalıp üretilirken bir hata oluştu.");
            if (options?.onError) options.onError(payload.message || "Kalıp üretilirken bir hata oluştu.");
            cleanUp();
          }
        } catch (e) {
          console.error("WebSocket message parsing error:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setStatusWithRef("ERROR");
        setError("Canlı AI sunucusu ile bağlantı kurulurken bir ağ hatası oluştu.");
        if (options?.onError) options.onError("Canlı AI sunucusu ile bağlantı kurulurken bir ağ hatası oluştu.");
        cleanUp();
      };

      ws.onclose = (event) => {
        // Eğer bağlantı completed veya error olmadan kapandıysa
        if (socketRef.current && statusRef.current !== "COMPLETED" && statusRef.current !== "ERROR") {
          setStatusWithRef("ERROR");
          setError(`Bağlantı beklenmedik şekilde kapandı. (Kod: ${event.code})`);
          if (options?.onError) options.onError(`Bağlantı beklenmedik şekilde kapandı. (Kod: ${event.code})`);
          cleanUp();
        }
      };

    } catch (err: any) {
      console.error("WS setup error:", err);
      setStatusWithRef("ERROR");
      setError(err.message || "Görsel yüklenirken bir hata oluştu.");
      if (options?.onError) options.onError(err.message || "Görsel yüklenirken bir hata oluştu.");
      cleanUp();
    }
  }, [token, cleanUp, setStatusWithRef, options]);

  return {
    status,
    progressMessage,
    result,
    error,
    generatePatternWS,
    resetWS: () => {
      setStatusWithRef("IDLE");
      setProgressMessage("");
      setError("");
      setResult(null);
      cleanUp();
    }
  };
}
