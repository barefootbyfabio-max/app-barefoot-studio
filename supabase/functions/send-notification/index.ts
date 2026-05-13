import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const PROFESSOR_EMAIL = Deno.env.get("PROFESSOR_EMAIL") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  type: "approval" | "booking" | "cancellation" | "fixed_approved";
  recipientEmail?: string;
  recipientName?: string;
  details?: {
    studentName?: string;
    date?: string;
    time?: string;
    dayOfWeek?: string;
  };
}

const getEmailContent = (request: NotificationRequest) => {
  const { type, recipientName, details } = request;

  switch (type) {
    case "approval":
      return {
        subject: "Bem-vindo ao Barefoot Studio! 🎉",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Olá ${recipientName || ""}! 👋</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Seu cadastro no <strong>Barefoot Studio</strong> foi aprovado!
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Agora você pode acessar o sistema e começar a agendar suas aulas.
            </p>
            <div style="margin: 30px 0;">
              <a href="https://barefootstudio.lovable.app" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;">
                Acessar o sistema
              </a>
            </div>
            <p style="color: #6a6a6a; font-size: 14px;">
              Nos vemos em breve! 🧘
            </p>
          </div>
        `,
      };

    case "booking":
      return {
        subject: `Nova aula agendada - ${details?.studentName || "Aluno"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Nova Aula Agendada 📅</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Um aluno agendou uma nova aula:
            </p>
            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Aluno:</strong> ${details?.studentName || "-"}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${details?.date || "-"}</p>
              <p style="margin: 5px 0;"><strong>Horário:</strong> ${details?.time || "-"}</p>
            </div>
          </div>
        `,
      };

    case "cancellation":
      return {
        subject: `Aula cancelada - ${details?.studentName || "Aluno"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Aula Cancelada ❌</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Um aluno cancelou uma aula:
            </p>
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Aluno:</strong> ${details?.studentName || "-"}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${details?.date || "-"}</p>
              <p style="margin: 5px 0;"><strong>Horário:</strong> ${details?.time || "-"}</p>
            </div>
          </div>
        `,
      };

    case "fixed_approved":
      return {
        subject: "Seu horário fixo foi aprovado! ⭐",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Horário Fixo Confirmado! ⭐</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Olá ${recipientName || ""}!
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Sua solicitação de horário fixo foi aprovada!
            </p>
            <div style="background-color: #fef9c3; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Dia:</strong> ${details?.dayOfWeek || "-"}</p>
              <p style="margin: 5px 0;"><strong>Horário:</strong> ${details?.time || "-"}</p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              A partir de agora, esta vaga está reservada automaticamente para você toda semana.
            </p>
          </div>
        `,
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const request: NotificationRequest = await req.json();
    console.log("Received notification request:", request);

    const { type, recipientEmail } = request;
    const { subject, html } = getEmailContent(request);

    // Determine recipient based on notification type
    let toEmail: string;
    if (type === "booking" || type === "cancellation") {
      toEmail = PROFESSOR_EMAIL;
    } else {
      toEmail = recipientEmail || "";
    }

    if (!toEmail) {
      throw new Error("No recipient email provided");
    }

    console.log(`Sending ${type} email to: ${toEmail}`);

    const { data, error } = await resend.emails.send({
      from: "Barefoot Studio <noreply@barefootstudio.lovable.app>",
      to: [toEmail],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
