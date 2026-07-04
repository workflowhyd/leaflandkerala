import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ID_TYPE_LABEL: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
};

// Force a consistent size/format so the PDF layout can use fixed dimensions.
function transformForPdf(url: string): string {
  return url.replace("/upload/", "/upload/w_1000,h_620,c_fill,q_auto,f_jpg/");
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(transformForPdf(url));
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      name: true,
      mobile: true,
      address: true,
      governmentIdType: true,
      governmentIdNumber: true,
      governmentIdFrontUrl: true,
      governmentIdBackUrl: true,
    },
  });

  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!employee.governmentIdFrontUrl || !employee.governmentIdBackUrl) {
    return NextResponse.json({ error: "Government ID documents are not available for this employee" }, { status: 400 });
  }

  const [frontImage, backImage] = await Promise.all([
    fetchImageAsBase64(employee.governmentIdFrontUrl),
    fetchImageAsBase64(employee.governmentIdBackUrl),
  ]);

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  // Header banner
  doc.setFillColor(30, 77, 61);
  doc.rect(0, 0, pageWidth, 74, "F");
  doc.setTextColor(248, 245, 238);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LeafLand Kerala", marginX, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Employee Government ID Record", marginX, 53);
  doc.setTextColor(0, 0, 0);
  y = 104;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Employee Details", marginX, y);
  y += 10;
  doc.setDrawColor(210, 224, 216);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 22;

  const rows: [string, string][] = [
    ["Employee Name", employee.name],
    ["Mobile Number", employee.mobile],
    ["Address", employee.address || "—"],
    ["Government ID Type", employee.governmentIdType ? ID_TYPE_LABEL[employee.governmentIdType] : "—"],
    ["Government ID Number", employee.governmentIdNumber || "—"],
  ];

  doc.setFontSize(10.5);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const wrapped = doc.splitTextToSize(value, contentWidth - 170);
    doc.text(wrapped, marginX + 170, y);
    y += Math.max(16, wrapped.length * 14);
  }

  y += 12;

  const imgWidth = contentWidth;
  const imgHeight = (imgWidth * 620) / 1000;

  function addIdImage(title: string, base64: string | null) {
    if (y + 24 + imgHeight > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 77, 61);
    doc.text(title, marginX, y);
    y += 12;
    if (base64) {
      doc.addImage(base64, "JPEG", marginX, y, imgWidth, imgHeight);
      y += imgHeight + 20;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(150, 0, 0);
      doc.text("Image could not be loaded", marginX, y + 14);
      y += 34;
    }
  }

  addIdImage("Government ID — Front", frontImage);
  addIdImage("Government ID — Back", backImage);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`,
    marginX,
    doc.internal.pageSize.getHeight() - 30
  );

  const pdfBytes = doc.output("arraybuffer");
  const safeName = employee.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="employee-id-${safeName}.pdf"`,
    },
  });
}
