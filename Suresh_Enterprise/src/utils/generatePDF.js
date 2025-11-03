import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const generatePDF = async (ref, fileName = "invoice.pdf") => {
    if (!ref) return;

    const canvas = await html2canvas(ref, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(fileName);
};

export const generateMultiCopyPDF = async (renderCopy, baseFileName = "invoice") => {
    const copies = ["Original", "Duplicate", "Triplicate For Suppliers"];
    const pdf = new jsPDF("p", "mm", "a4");
    
    for (let i = 0; i < copies.length; i++) {
        const copyType = copies[i];
        
        const element = await renderCopy(copyType);
       
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (i > 0) {
            pdf.addPage();
        }
        
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }
    
    pdf.save(`${baseFileName}.pdf`);
};
