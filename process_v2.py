import sys
from bs4 import BeautifulSoup
import json

def process_html(html_content, genero_name):
    soup = BeautifulSoup(html_content, 'html.parser')
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
        valid_links = []
        for le in link_elems:
            a = le.find('a')
            if a and a.get('href') and a.get('href') != '#':
                valid_links.append((le, a))
        
        num_links = len(valid_links)
        for i, (le, a) in enumerate(valid_links):
            label = le.get_text(strip=True).replace('BAIXAR ', '')
            if label == 'AGORA':
                if num_links > 1:
                    label = f"Parte {i+1:02d}"
                else:
                    label = 'Parte Única'
            links.append({"label": label, "url": a['href']})

                
        if name not in artists:
            artists[name] = {
                "artista_nome": name,
                "imagem_url": img_src,
                "genero": genero_name,
                "links": links
            }
        else:
            existing_urls = [l['url'] for l in artists[name]['links']]
            for l in links:
                if l['url'] not in existing_urls:
                    artists[name]['links'].append(l)
    return artists

if __name__ == "__main__":
    genero = sys.argv[1] if len(sys.argv) > 1 else "Brega"
    html_input = sys.stdin.read()
    artists = process_html(html_input, genero)
    
    for artist in artists.values():
        links_json = json.dumps(artist['links'], ensure_ascii=False)
        name_escaped = artist['artista_nome'].replace("'", "''")
        img_escaped = artist['imagem_url'].replace("'", "''")
        links_escaped = links_json.replace("'", "''")
        sql = f"INSERT INTO discografias (artista_nome, imagem_url, genero, links) VALUES ('{name_escaped}', '{img_escaped}', '{genero}', '{links_escaped}') ON CONFLICT (artista_nome, genero) DO UPDATE SET links = EXCLUDED.links, imagem_url = EXCLUDED.imagem_url;"
        print(sql)
