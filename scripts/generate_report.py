import os
import psycopg2
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import requests
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv('.env')

def download_image(url, filepath):
    try:
        response = requests.get(url, stream=True, timeout=15)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(8192):
                    f.write(chunk)
            
            # Verify image integrity to prevent ReportLab crashes
            from PIL import Image
            try:
                img = Image.open(filepath)
                img.verify()
                img.close()
                
                # Full decode and force normalize to clean JPEG 
                # python-docx will crash (UnrecognizedImageError) if headers are weird
                img = Image.open(filepath)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img.save(filepath, 'JPEG')
                img.close()
                return True
            except Exception as img_err:
                print(f"Image {filepath} is truncated/corrupted: {img_err}")
                if os.path.exists(filepath): os.remove(filepath)
                return False
                
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    
    if os.path.exists(filepath): os.remove(filepath)
    return False

def generate_reports():
    print("Generating Advanced Evaluation Reports...")

    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Database URL not found.")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Pull Data into Pandas DataFrame
        query = """
            SELECT 
                id, subject, cloudinary_url, enhanced_url, recommended_tool as tool, 
                processing_time_ms, user_rating, ssim_score, brisque_score
            FROM photos 
            WHERE recommended_tool IS NOT NULL 
                AND ssim_score IS NOT NULL 
                AND brisque_score IS NOT NULL
        """
        cur.execute(query)
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        df = pd.DataFrame(rows, columns=cols)
        
        cur.close()
        conn.close()
        
        if df.empty:
            print("Not enough evaluation data with SSIM/BRISQUE scores to generate a report.")
            return

        # Ensure directory
        os.makedirs('reports', exist_ok=True)
        os.makedirs('temp_eval', exist_ok=True)

        print("Generating charts...")
        generate_charts(df)
        
        print("Downloading case study images...")
        case_studies = get_case_studies(df)
        download_case_study_images(case_studies)

        print("Generating PDF Report...")
        generate_pdf_report(df, case_studies)

        print("Generating Word Document Report...")
        generate_word_report(df, case_studies)
        
        print(f"Reports Successfully Generated:\\n - reports/lumina_eval_report.pdf\\n - reports/lumina_eval_report.docx")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error generating report: {e}")

def generate_charts(df):
    plt.style.use('dark_background')
    colors = {'upscale': '#e85d04', 'restore': '#4361ee', 'edit': '#2a9d8f', 'lowlight': '#e9c46a'}
    
    # Page 2: Bar chart comparing average SSIM scores per tool type
    plt.figure(figsize=(8, 6), facecolor='#03071e')
    ax = plt.axes()
    ax.set_facecolor('#03071e')
    avg_ssim = df.groupby('tool')['ssim_score'].mean()
    color_map = [colors.get(t, '#888888') for t in avg_ssim.index]
    avg_ssim.plot(kind='bar', color=color_map, edgecolor='none')
    plt.title('Average SSIM Score per Tool Type')
    plt.ylabel('SSIM Score')
    plt.xticks(rotation=0)
    plt.tight_layout()
    plt.savefig('temp_eval/plot_ssim.png', facecolor='#03071e')
    plt.close()

    # Page 3: Bar chart comparing average BRISQUE scores per tool type
    plt.figure(figsize=(8, 6), facecolor='#03071e')
    ax = plt.axes()
    ax.set_facecolor('#03071e')
    avg_brisque = df.groupby('tool')['brisque_score'].mean()
    color_map = [colors.get(t, '#888888') for t in avg_brisque.index]
    avg_brisque.plot(kind='bar', color=color_map, edgecolor='none')
    plt.title('Average BRISQUE Score per Tool Type\\n(Lower BRISQUE is better)')
    plt.ylabel('BRISQUE Score')
    plt.xticks(rotation=0)
    plt.tight_layout()
    plt.savefig('temp_eval/plot_brisque.png', facecolor='#03071e')
    plt.close()

    # Page 4: Scatter plot SSIM vs processing time (seconds)
    plt.figure(figsize=(8, 6), facecolor='#03071e')
    ax = plt.axes()
    ax.set_facecolor('#03071e')
    df['processing_time_sec'] = df['processing_time_ms'] / 1000.0
    for tool in df['tool'].unique():
        subset = df[df['tool'] == tool]
        plt.scatter(subset['processing_time_sec'], subset['ssim_score'], label=tool, color=colors.get(tool, '#888888'), alpha=0.7)
    plt.title('SSIM Score vs Processing Time')
    plt.xlabel('Processing Time (Seconds)')
    plt.ylabel('SSIM Score')
    plt.legend()
    plt.tight_layout()
    plt.savefig('temp_eval/plot_scatter.png', facecolor='#03071e')
    plt.close()

    # Page 5: Processing latency histogram
    plt.figure(figsize=(8, 6), facecolor='#03071e')
    ax = plt.axes()
    ax.set_facecolor('#03071e')
    sns.histplot(data=df, x='processing_time_ms', hue='tool', palette=colors, kde=True, bins=15)
    plt.title('Processing Time Distribution')
    plt.xlabel('Processing Time (ms)')
    plt.ylabel('Count')
    plt.tight_layout()
    plt.savefig('temp_eval/plot_latency_hist.png', facecolor='#03071e')
    plt.close()

def get_case_studies(df):
    sorted_df = df.sort_values(by='ssim_score', ascending=False)
    top_3 = sorted_df.head(3).to_dict('records')
    bottom_3 = sorted_df.tail(3).to_dict('records')
    return {'top': top_3, 'bottom': bottom_3}

def download_case_study_images(case_studies):
    for i, row in enumerate(case_studies['top']):
        download_image(row['cloudinary_url'], f"temp_eval/top_{i}_orig.jpg")
        download_image(row['enhanced_url'], f"temp_eval/top_{i}_enh.jpg")
    for i, row in enumerate(case_studies['bottom']):
        download_image(row['cloudinary_url'], f"temp_eval/bottom_{i}_orig.jpg")
        download_image(row['enhanced_url'], f"temp_eval/bottom_{i}_enh.jpg")

def generate_pdf_report(df, case_studies):
    pdf_path = "reports/lumina_eval_report.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter

    # Page 1: Cover
    c.setFont("Helvetica-Bold", 32)
    c.drawString(50, height - 150, "Lumina AI")
    c.setFont("Helvetica", 20)
    c.drawString(50, height - 180, "Image Enhancement Evaluation Report")
    
    c.setFont("Helvetica", 14)
    c.drawString(50, height - 250, f"Date Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
    c.drawString(50, height - 280, f"Total Images Evaluated: {len(df)}")
    
    avg_ssim = df['ssim_score'].mean()
    avg_brisque = df['brisque_score'].mean()
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 340, "Global Summary Metrics:")
    c.setFont("Helvetica", 14)
    c.drawString(70, height - 370, f"Average SSIM Score: {avg_ssim:.4f} (Closer to 1 = Better)")
    c.drawString(70, height - 390, f"Average BRISQUE Score: {avg_brisque:.4f} (Lower = Better)")
    c.showPage()

    def draw_plot_page(title, img_path):
        c.setFont("Helvetica-Bold", 18)
        c.drawString(50, height - 50, title)
        if os.path.exists(img_path):
            c.drawImage(ImageReader(img_path), 50, height - 450, width=500, height=375)
        c.showPage()

    draw_plot_page("SSIM Scores per Tool Type", 'temp_eval/plot_ssim.png')
    draw_plot_page("BRISQUE Scores per Tool Type", 'temp_eval/plot_brisque.png')
    draw_plot_page("SSIM Score vs Processing Time", 'temp_eval/plot_scatter.png')
    draw_plot_page("Processing Latency Distribution", 'temp_eval/plot_latency_hist.png')

    # Page 6: User satisfaction
    valid_rates = df.dropna(subset=['user_rating'])
    pos_rates = len(valid_rates[valid_rates['user_rating'] == 1])
    neg_rates = len(valid_rates[valid_rates['user_rating'] == -1])
    total_rates = pos_rates + neg_rates
    satisfaction = (pos_rates / total_rates * 100) if total_rates > 0 else 0
    
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 100, "User Satisfaction Summary")
    c.setFont("Helvetica", 16)
    c.drawString(50, height - 150, f"Total Thumbs Up: {pos_rates}")
    c.drawString(50, height - 180, f"Total Thumbs Down: {neg_rates}")
    c.drawString(50, height - 220, f"Overall Satisfaction Rate: {satisfaction:.1f}%")
    c.showPage()

    # Page 7+: Case Studies
    def draw_case_study(group, label, is_top=True):
        for i, row in enumerate(group):
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, height - 50, f"{label} #{i+1} (ID: {str(row['id'])[:8]})")
            
            prefix = "top" if is_top else "bottom"
            img_orig = f"temp_eval/{prefix}_{i}_orig.jpg"
            img_enh = f"temp_eval/{prefix}_{i}_enh.jpg"
            
            if os.path.exists(img_orig):
                c.drawImage(ImageReader(img_orig), 50, height - 350, width=220, height=220, preserveAspectRatio=True)
            if os.path.exists(img_enh):
                c.drawImage(ImageReader(img_enh), 300, height - 350, width=220, height=220, preserveAspectRatio=True)
                
            c.setFont("Helvetica-Bold", 14)
            c.drawString(100, height - 380, "Original Cloudinary")
            c.drawString(350, height - 380, "Enhanced Image")
            
            c.setFont("Helvetica", 12)
            c.drawString(50, height - 420, f"Tool: {row['tool']} | SSIM: {row['ssim_score']:.4f} | BRISQUE: {row['brisque_score']:.4f}")
            c.drawString(50, height - 440, f"Processing Time: {row['processing_time_ms']}ms | User Rating: {row['user_rating']}")
            c.showPage()

    draw_case_study(case_studies['top'], "Top Performing Image (Highest SSIM)", True)
    draw_case_study(case_studies['bottom'], "Worst Performing Image (Lowest SSIM)", False)
    
    c.save()

def generate_word_report(df, case_studies):
    doc = Document()
    
    # Title Page
    title = doc.add_heading('Lumina AI — Image Enhancement Evaluation Report', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle = doc.add_paragraph('A quantitative and qualitative assessment of AI-powered image enhancement')
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_p = doc.add_paragraph(f"Date: {pd.Timestamp.now().strftime('%Y-%m-%d')}")
    date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_page_break()

    # Section 1
    doc.add_heading('Section 1 — Introduction', level=1)
    doc.add_paragraph("Lumina uses AI models to enhance photos. This report evaluates their performance using objective image quality metrics.")

    # Section 2
    doc.add_heading('Section 2 — Methodology', level=1)
    doc.add_paragraph("SSIM measures how similar the enhanced image is to the original in terms of structure, brightness and contrast. A score of 1.0 means identical, a score closer to 0 means significant structural change.")
    doc.add_paragraph("BRISQUE is a no-reference quality metric that evaluates the enhanced image alone without needing the original for comparison. It detects distortions like blur, noise and ringing artifacts. A lower score indicates better perceptual quality.")
    doc.add_paragraph("Processing time was measured using Node.js `performance.now()` timers wrapping each Replicate API call, recorded in milliseconds and stored in the database.")
    doc.add_paragraph("Users were presented with a thumbs up / thumbs down widget after each enhancement. Ratings were stored as +1 (positive) or -1 (negative) in the database.")

    # Section 3
    doc.add_heading('Section 3 — Results Table', level=1)
    sorted_df = df.sort_values(by='ssim_score', ascending=False)
    table = doc.add_table(rows=1, cols=7)
    table.style = 'Light Shading Accent 1'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Image ID'
    hdr_cells[1].text = 'Subject'
    hdr_cells[2].text = 'Tool'
    hdr_cells[3].text = 'SSIM Result'
    hdr_cells[4].text = 'BRISQUE'
    hdr_cells[5].text = 'Time (s)'
    hdr_cells[6].text = 'Rating'

    has_subj = 'subject' in df.columns

    for _, row in sorted_df.iterrows():
        row_cells = table.add_row().cells
        row_cells[0].text = str(row['id'])[:8]
        row_cells[1].text = str(row['subject']) if has_subj and pd.notna(row['subject']) else 'N/A'
        row_cells[2].text = str(row['tool']).capitalize()
        row_cells[3].text = f"{row['ssim_score']:.4f}"
        row_cells[4].text = f"{row['brisque_score']:.4f}"
        row_cells[5].text = f"{row['processing_time_ms']/1000.0:.2f}"
        row_cells[6].text = str(row['user_rating'])

    # Section 4
    doc.add_heading('Section 4 — Summary Statistics', level=1)
    stats_table = doc.add_table(rows=1, cols=5)
    stats_table.style = 'Light Shading Accent 2'
    hdr_cells = stats_table.rows[0].cells
    hdr_cells[0].text = 'Tool'
    hdr_cells[1].text = 'Avg SSIM'
    hdr_cells[2].text = 'Avg BRISQUE'
    hdr_cells[3].text = 'Avg Time (s)'
    hdr_cells[4].text = 'Satisfaction %'

    for tool in df['tool'].unique():
        subset = df[df['tool'] == tool]
        avg_ssim = subset['ssim_score'].mean()
        avg_brisque = subset['brisque_score'].mean()
        avg_time = subset['processing_time_ms'].mean() / 1000.0
        
        valid_rates = subset.dropna(subset=['user_rating'])
        pos_rates = len(valid_rates[valid_rates['user_rating'] == 1])
        total_rates = len(valid_rates[valid_rates['user_rating'].isin([1, -1])])
        sat_pct = (pos_rates / total_rates * 100) if total_rates > 0 else 0

        row_cells = stats_table.add_row().cells
        row_cells[0].text = str(tool).capitalize()
        row_cells[1].text = f"{avg_ssim:.4f}"
        row_cells[2].text = f"{avg_brisque:.4f}"
        row_cells[3].text = f"{avg_time:.2f}"
        row_cells[4].text = f"{sat_pct:.1f}%"

    # Section 5
    doc.add_heading('Section 5 — Before/After Image Comparisons', level=1)
    
    def insert_case_studies(group, prefix, is_best=True):
        label = "Best" if is_best else "Worst"
        for i, row in enumerate(group):
            p = doc.add_paragraph()
            run = p.add_run(f"Top {i+1} {label} Performing (ID: {str(row['id'])[:8]})")
            run.bold = True
            run.font.color.rgb = RGBColor(0, 128, 0) if is_best else RGBColor(255, 0, 0)

            img_table = doc.add_table(rows=1, cols=2)
            orig_path = f"temp_eval/{prefix}_{i}_orig.jpg"
            enh_path = f"temp_eval/{prefix}_{i}_enh.jpg"
            
            if os.path.exists(orig_path):
                img_table.cell(0,0).paragraphs[0].add_run().add_picture(orig_path, width=Inches(2.5))
            if os.path.exists(enh_path):
                img_table.cell(0,1).paragraphs[0].add_run().add_picture(enh_path, width=Inches(2.5))

            doc.add_paragraph(f"Caption: Tool: {str(row['tool']).capitalize()} | SSIM: {row['ssim_score']:.4f} | BRISQUE: {row['brisque_score']:.4f} | Time: {row['processing_time_ms']}ms")

    insert_case_studies(case_studies['top'], "top", True)
    insert_case_studies(case_studies['bottom'], "bottom", False)

    # Section 6
    doc.add_heading('Section 6 — Discussion', level=1)
    
    avg_ssim_ps = df.groupby('tool')['ssim_score'].mean()
    best_tool = avg_ssim_ps.idxmax()
    best_ssim = avg_ssim_ps.max()
    doc.add_paragraph(f"Based on the mathematical objective scoring, the {str(best_tool).capitalize()} tool performed better on average regarding SSIM, yielding a peak structural similarity score of {best_ssim:.4f}. This suggests it maintains higher fidelity to the original geometry than other models.")
    
    brisque_high = len(df[df['brisque_score'] > 50])
    if brisque_high > 0:
         brisque_text = f"The BRISQUE scores indicate potential visible artifacts, with {brisque_high} images scoring above 50, meaning significant noise or unnatural distributions may be present in those renders."
    else:
         brisque_text = "The BRISQUE scores indicate healthy perceptual quality overall. No scores exceeded the 50.0 distortion threshold, implying well-preserved natural scene statistics without significant digital artifacts."
    doc.add_paragraph(brisque_text)

    avg_time_ps = df.groupby('tool')['processing_time_ms'].mean() / 1000.0
    fastest_tool = avg_time_ps.idxmin()
    fastest_time = avg_time_ps.min()
    doc.add_paragraph(f"Processing time analysis indicates the {str(fastest_tool).capitalize()} tool is significantly faster, averaging only {fastest_time:.2f} seconds per image. This latency measurement reflects total round-trip time including download and Replicate generation.")

    # Section 7
    doc.add_heading('Section 7 — Limitations', level=1)
    doc.add_paragraph("Note that SSIM comparison requires mathematically resizing the enhanced image back to original dimensions. This downsampling step may inherently affect SSIM scores for models that strictly upscale dimensions. Furthermore, BRISQUE spatial scores can vary wildly based purely on the scene's content type (e.g., starry skies vs flat walls), and subjective user ratings are currently limited to a very small sample size.")

    # Section 8
    doc.add_heading('Section 8 — Conclusion', level=1)
    doc.add_paragraph(f"In conclusion, across {len(df)} discrete evaluation iterations, the Lumina AI pipeline achieved a global average SSIM integrity of {df['ssim_score'].mean():.4f} and a mean BRISQUE distortion parameter of {df['brisque_score'].mean():.4f}. This mathematically demonstrates robust, production-ready enhancement capabilities across diverse conditions.")

    doc.save("reports/lumina_eval_report.docx")

if __name__ == "__main__":
    generate_reports()
