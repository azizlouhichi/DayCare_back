from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
import torch
import requests
import json
import os

app = Flask(__name__)

model = SentenceTransformer('all-MiniLM-L6-v2')

API_BASE_URL = os.environ.get('NODE_API_URL', 'https://daycareback-production.up.railway.app/api')

def get_all_services():
    try:
        response = requests.get(f"{API_BASE_URL}/services")
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"Erreur lors de la récupération des services: {e}")
        return []

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    user_id = data.get('userId')
    reservations = data.get('reservations', [])
    categories = data.get('categories', [])
    
    if not reservations and not categories:
        return jsonify({"error": "Données insuffisantes pour la recommandation"}), 400

    # Récupérer tous les services disponibles
    all_services_data = get_all_services()
    all_service_names = [service.get('name', '') for service in all_services_data]
    
    # Si nous avons des réservations, utiliser l'embedding pour les recommandations
    if reservations:
        # Encoder les noms des services réservés
        reservation_embeddings = model.encode(reservations, convert_to_tensor=True)
        
        # Encoder tous les services disponibles
        service_embeddings = model.encode(all_service_names, convert_to_tensor=True)
        
        # Calculer la similarité pour chaque réservation avec tous les services
        similar_services = []
        for res_idx, res_embedding in enumerate(reservation_embeddings):
            # Calculer les scores de similarité pour cette réservation
            cosine_scores = util.pytorch_cos_sim(res_embedding, service_embeddings)[0]
            
            # Pour chaque service, garder le meilleur score de similarité avec n'importe quelle réservation
            for svc_idx, score in enumerate(cosine_scores):
                service = all_services_data[svc_idx]
                # Ne pas recommander les services déjà réservés
                if service.get('name') not in reservations:
                    # Vérifier si ce service est déjà dans notre liste
                    existing = next((s for s in similar_services if s['service']['_id'] == service['_id']), None)
                    if existing:
                        # Garder le score le plus élevé
                        existing['score'] = max(existing['score'], float(score))
                    else:
                        similar_services.append({
                            "service": service,
                            "score": float(score),
                            "similar_to": reservations[res_idx]  # Indiquer à quelle réservation ce service est similaire
                        })
        
        # Trier par score
        similar_services.sort(key=lambda x: x["score"], reverse=True)
        
        return jsonify({
            "recommendations": similar_services[:10],  # Limiter aux 10 services les plus similaires
            "categories": categories
        })
    
    # Si nous n'avons pas de réservations mais des catégories populaires
    elif categories:
        return jsonify({
            "recommendations": [],
            "categories": categories
        })

@app.route('/popular-categories', methods=['POST'])
def popular_categories():
    data = request.get_json()
    user_id = data.get('userId')
    
    # Cette route serait appelée pour obtenir les catégories populaires
    # pour un utilisateur ou globalement
    # Dans cette implémentation, nous renvoyons simplement les données reçues
    # car le traitement réel sera fait côté Node.js
    
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001)