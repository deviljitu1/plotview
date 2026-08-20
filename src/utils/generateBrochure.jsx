import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BrochureTemplate from '../components/BrochureTemplate';

export const generateBrochure = async (project, plots) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary hidden container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.zIndex = '-1';
      document.body.appendChild(container);

      const root = createRoot(container);
      
      // Render the template
      root.render(
        <div id="pdf-brochure-wrapper">
          <BrochureTemplate project={project} plots={plots} />
        </div>
      );

      // Wait a bit for React to mount and images to load (especially crossOrigin ones)
      setTimeout(async () => {
        try {
          const wrapper = document.getElementById('brochure-container');
          if (!wrapper) throw new Error('Brochure wrapper not found');

          // Generate Canvas
          const canvas = await html2canvas(wrapper, {
            scale: 2, // Higher resolution
            useCORS: true,
            allowTaint: true,
            logging: false,
          });

          // Generate PDF
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width / 2, canvas.height / 2] // match the scaled down size
          });

          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
          
          // Download the PDF
          const fileName = project?.name ? `${project.name.replace(/\s+/g, '_')}_Brochure.pdf` : 'Project_Brochure.pdf';
          pdf.save(fileName);
          
          resolve();
        } catch (err) {
          console.error("PDF Generation Error:", err);
          reject(err);
        } finally {
          // Cleanup
          root.unmount();
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        }
      }, 1500); // 1.5s delay to let images load
    } catch (error) {
      console.error("Setup Error:", error);
      reject(error);
    }
  });
};
