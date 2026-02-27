import psycopg2
import psycopg2.extras
import pandas as pd
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import os
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv('.env')

def generate_visual_report():
    print("Generating Lumina Evaluation PDF Report...")
    
    # Connect to DB
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Database URL not found.")
        return
        
    try:
        conn = psycopg2.connect(DATABASE_URL)
        
        # Pull Data into Pandas DataFrame
        query = """
            SELECT recommended_tool as tool, processing_time_ms, user_rating, ssim_score, brisque_score
            FROM photos 
            WHERE recommended_tool IS NOT NULL
        """
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            print("Not enough evaluation data to generate a report.")
            return

        # Ensure directory
        os.makedirs('reports', exist_ok=True)
        os.makedirs('temp_eval', exist_ok=True)

        # --- 1. Analyze Data & Generate Plots ---
        
        # Plot 1: Average Processing Time per Tool
        plt.figure(figsize=(6, 4))
        avg_time = df.groupby('tool')['processing_time_ms'].mean()
        avg_time.plot(kind='bar', color=['#ffba08', '#e85d04', '#dc2f02', '#9d0208'])
        plt.title('Average Latency per AI Model (ms)')
        plt.ylabel('Milliseconds')
        plt.tight_layout()
        plot1_path = 'temp_eval/plot_latency.png'
        plt.savefig(plot1_path)
        plt.close()

        # Plot 2: BRISQUE Quality Score per Tool (Lower is Better)
        plt.figure(figsize=(6, 4))
        valid_brisque = df.dropna(subset=['brisque_score'])
        if not valid_brisque.empty:
            avg_brisque = valid_brisque.groupby('tool')['brisque_score'].mean()
            avg_brisque.plot(kind='bar', color=['#3f37c9', '#4361ee', '#48cae4'])
            plt.title('Average BRISQUE Distortion Score (Lower = Better)')
            plt.ylabel('BRISQUE Score')
            plt.tight_layout()
        plot2_path = 'temp_eval/plot_brisque.png'
        plt.savefig(plot2_path)
        plt.close()
        
        # --- 2. Generate PDF using ReportLab ---
        pdf_path = "reports/lumina_eval_report.pdf"
        c = canvas.Canvas(pdf_path, pagesize=letter)
        width, height = letter
        
        # Title
        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, height - 50, "Lumina AI Quality Evaluation Report")
        
        # Metadata
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 80, f"Total Enhancements Analyzed: {len(df)}")
        
        valid_rates = df.dropna(subset=['user_rating'])
        pos_rates = len(valid_rates[valid_rates['user_rating'] == 1])
        neg_rates = len(valid_rates[valid_rates['user_rating'] == -1])
        total_rates = pos_rates + neg_rates
        satisfaction = (pos_rates / total_rates * 100) if total_rates > 0 else 0
        
        c.drawString(50, height - 100, f"Subjective Satisfaction Rate: {satisfaction:.1f}% ({pos_rates} 👍 / {neg_rates} 👎)")
        
        # Insert Plot 1
        c.drawImage(ImageReader(plot1_path), 50, height - 400, width=400, height=266)
        
        # Insert Plot 2
        c.drawImage(ImageReader(plot2_path), 50, height - 700, width=400, height=266)
        
        c.showPage()
        c.save()
        
        print(f"Report Successfully Generated: {pdf_path}")
        
    except Exception as e:
        print(f"Error generating report: {e}")

if __name__ == "__main__":
    generate_visual_report()
