from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from app.config.config import Config
from app.backend.database.db_manager import DatabaseManager
from app.backend.tools.db_tools import DBTools
from app.backend.agents.chatbot import Chatbot
from app.backend.agents.pdf_extractor import PDFExtractor


# Create Flask app that serves frontend files from app/frontend
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
APP_STATIC = os.path.join(BASE_DIR, "app", "frontend", "static")
APP_TEMPLATES = os.path.join(BASE_DIR, "app", "frontend", "templates")

app = Flask(__name__, static_folder=str(APP_STATIC), template_folder=str(APP_TEMPLATES))


# Initialize backend components
db = DatabaseManager(Config.DATABASE_PATH)
db_tools = DBTools(db)
chatbot = Chatbot(api_key=Config.API_KEY, model=Config.CHAT_BOT_MODEL, system_prompt=Config.CHAT_BOT_SYSTEM_PROMPT, tools_obj=db_tools)
pdf_extractor = PDFExtractor(api_key=Config.API_KEY, model=Config.PDF_EXTRACTOR_MODEL, system_prompt=Config.PDF_EXTRACTOR_SYSTEM_PROMPT)


@app.route("/")
def index():
	# Serve the dashboard (or adjust to a different template name)
	return render_template("dashboard.html")


@app.route('/static/<path:filename>')
def static_files(filename):
	return send_from_directory(APP_STATIC, filename)


@app.route('/api/expenses', methods=['GET'])
def get_expenses():
	start_date = request.args.get('start_date')
	end_date = request.args.get('end_date')
	if not start_date or not end_date:
		return jsonify({'error': 'start_date and end_date query params required'}), 400
	data = db.get_expenses_by_dates(start_date, end_date)
	return jsonify(data)


@app.route('/api/expense', methods=['POST'])
def add_expense():
	payload = request.get_json() or {}
	required = ['amount', 'category', 'description', 'date']
	if not all(k in payload for k in required):
		return jsonify({'error': f'required fields: {required}'}), 400
	success = db.add_expense(payload['amount'], payload['category'], payload['description'], payload['date'])
	return jsonify({'success': bool(success)})


@app.route('/api/salary', methods=['POST'])
def add_salary():
	payload = request.get_json() or {}
	required = ['amount', 'month', 'year']
	if not all(k in payload for k in required):
		return jsonify({'error': f'required fields: {required}'}), 400
	success = db.add_salary(payload['amount'], payload['month'], payload['year'])
	return jsonify({'success': bool(success)})


@app.route('/api/pdf-extract', methods=['POST'])
def extract_pdf():
	if 'file' not in request.files:
		return jsonify({'error': 'file is required'}), 400
	f = request.files['file']
	save_path = os.path.join(os.getcwd(), 'tmp_uploaded.pdf')
	f.save(save_path)
	result = None
	try:
		result = pdf_extractor.extract(save_path)
	except Exception as e:
		return jsonify({'error': str(e)}), 500
	finally:
		try:
			os.remove(save_path)
		except Exception:
			pass
	return jsonify({'result': result})


@app.route('/api/chat', methods=['POST'])
def chat():
	payload = request.get_json() or {}
	message = payload.get('message')
	if not message:
		return jsonify({'error': 'message field required'}), 400
	try:
		response = chatbot.send_message(message)
	except Exception as e:
		return jsonify({'error': str(e)}), 500
	return jsonify({'response': str(response)})


if __name__ == '__main__':
	app.run(debug=True, port=5000)
