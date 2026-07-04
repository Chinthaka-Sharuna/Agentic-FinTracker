import pdfplumber
from .base_agent import BaseAgent
import io


class PDFExtractor(BaseAgent):


    def __init__(self,api_key: str,base_url: str = "https://api.openai.com/v1",model: str = "gpt-4.1-mini",system_prompt: str = None):

        """
            Agent that extracts structured financial data from bank statement PDFs.

            This agent does two things:
            1. Reads a PDF file and extracts raw text/tables from each page
            2. Sends the extracted content to an LLM which returns structured JSON

            The returned JSON format (defined by the system prompt in config.YAML):
            {
                "salary": [{"amount": 0.00, "description": "", "date": "YYYY-MM-DD"}],
                "expenses": [{"amount": 0.00, "category": "", "description": "", "date": "YYYY-MM-DD"}]
            }

            Params:
                api_key        : Your API key
                base_url       : The base URL of the API provider
                model          : The model to use (e.g. "gpt-4.1-mini" — a cheaper model works fine here)
                system_prompt  : The system prompt telling the LLM how to extract and format the data
        """

        super().__init__(api_key=api_key, base_url=base_url, model=model)
        self.system_prompt = system_prompt


    def extract(self, raw_pdf) -> str:
        """
        Extract structured financial data from a PDF bank statement.

        Steps:
        1. Open the PDF and pull out text/tables from every page
        2. Send the raw content to the LLM for structuring
        3. Return clean JSON string

        Params:
            pdf_path : Path to the PDF file

        Returns:
            JSON string with salary and expense data, or None if no content found
        """
        raw_content = self._read_pdf(raw_pdf)

        if not raw_content:
            return None

        json_string = self._convert_to_json(raw_content)
        return json_string


    def _read_pdf(self, pdf) -> list:
        """
        Read a PDF file and extract text and tables from each page.

        If a page has tables, we extract the table data.
        If a page has no tables, we extract the plain text.

        Params:
            pdf_path : Path to the PDF file

        Returns:
            List of extracted content (mix of text strings and table lists)
        """
        content = []

        with pdfplumber.open(io.BytesIO(pdf)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        content.append(table)
                else:
                    text = page.extract_text()
                    if text:
                        content.append(text)

        return content


    def _convert_to_json(self, content: list) -> str:
        """
        Send extracted PDF content to the LLM and get back structured JSON.

        The LLM uses the system_prompt (from config.YAML) to know exactly
        what format to return the data in.

        Params:
            content : List of extracted text/tables from the PDF

        Returns:
            Clean JSON string (with markdown fences removed)
        """
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"Context: {content}"},
        ]

        response = self.api_call(model=self.model, messages=messages)
        raw = response.message.content

        # Clean up the response — LLMs sometimes wrap JSON in markdown code blocks
        return (raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip())