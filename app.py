from flask import Flask, render_template, request, url_for, redirect, session
from flask_sqlalchemy import SQLAlchemy
import os
import requests
from dotenv import load_dotenv
load_dotenv()
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('Secret_Key')
def get_info(cN):
    cN = cN.lower()
    data = None
    params = { 'q': cN, 'token': os.getenv('Finnhub_API_Key') }
    response = requests.get('https://finnhub.io/api/v1/search', params=params)
    config = response.json()
    smbl = config["result"][0]['symbol'] if config["result"] else None
    if smbl is None:
         return None
    params = { 'symbol': smbl, 'token': os.getenv('Finnhub_API_Key') }
    response = requests.get('https://finnhub.io/api/v1/stock/profile2', params=params)
    config = response.json()
    country = config['country'] if 'country' in config else None 
    if country is None:
         return None
    if len(config) == 0:
         return None
    if country != 'US' or country != 'USA':
        params = {'function': 'OVERVIEW', 'symbol': smbl, 'apikey': os.getenv('Alpha_Vantage_API_Key')}
        response = requests.get('https://www.alphavantage.co/query?', params=params)
        data = response.json()
    else:
         data = config
    return data

@app.route('/', methods=['GET', 'POST'])
def index():
    company_info = None
    if request.method == "POST":
        companyName = request.form['companyName']
        if companyName.lower() == 'facebook' or companyName.lower() == 'instagram':
                companyName = 'Meta'
        # if companyName.lower() == 'google' or companyName.lower() == 'youtube':
        #         companyName = 'Alphabet'
        company_info = get_info(companyName)
        session['company_info'] = company_info
        # print(company_info)
        if company_info == None:
            return redirect(url_for('error'))
    return render_template('base.html', company_info=company_info)

@app.route('/error')
def error():
     company_info = session.get('company_info')
     return render_template('error.html', company_info=company_info)
if __name__ == '__main__':
    app.run(debug=True)