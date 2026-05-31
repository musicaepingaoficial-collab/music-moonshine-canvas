import sys
from bs4 import BeautifulSoup
import json
import requests
import os

html_input = sys.stdin.read()
soup = BeautifulSoup(html_input, 'html.parser')
cards = soup.find_all('div', class_='carddiscos')

artists = {}

for card in cards:
    name_elem = card.find('h3')
    if not name_elem:
        continue
    name = name_elem.get_text(strip=True)
    
    img_elem = card.find('img')
    img_src = img_elem['src'] if img_elem else ""
    if img_src and not img_src.startswith('http'):
        img_src = "https://packdemusicas.com.br/Product/03-Discografias/" + img_src
        
    links = []
    link_elems = card.find_all('div', class_='btnbaixar')
    for le in link_elems:
        a = le.find('a')
        if a:
            label = le.get_text(strip=True).replace('BAIXAR ', '')
            links.append({"label": label, "url": a['href']})
            
    if name not in artists:
        artists[name] = {
            "artista_nome": name,
            "imagem_url": img_src,
            "genero": "FORRÓ",
            "links": links
        }
    else:
        existing_urls = [l['url'] for l in artists[name]['links']]
        for l in links:
            if l['url'] not in existing_urls:
                artists[name]['links'].append(l)

# Output SQL for psql
for artist in artists.values():
    links_json = json.dumps(artist['links'], ensure_ascii=False)
    sql = f"INSERT INTO discografias (artista_nome, imagem_url, genero, links) VALUES ('{artist['artista_nome'].replace(\"'\", \"''\")}', '{artist['imagem_url']}', 'FORRÓ', '{links_json.replace(\"'\", \"''\")}') ON CONFLICT (artista_nome, genero) DO UPDATE SET links = EXCLUDED.links, imagem_url = EXCLUDED.imagem_url;"
    print(sql)
