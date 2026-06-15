const express = require('express');
const router = express.Router();
const Reservation = require('../models/reservation');
const Service = require('../models/service');
const Category = require('../models/category'); // Ajout de l'import pour Category
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
const mongoose = require('mongoose');

require('dotenv').config();

const recommenderUrl = process.env.RECOMMENDER_URL || 'http://127.0.0.1:5001';

// Fonction pour obtenir les catégories les plus populaires pour un utilisateur
async function getUserTopCategories(userId) {
  try {
    // Aggrégation pour trouver les catégories avec le plus de réservations pour cet utilisateur
    const userCategoryStats = await Reservation.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $group: {
          _id: '$service.category',
          count: { $sum: 1 },
          services: { $push: '$service._id' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 } // Limiter aux 3 catégories les plus populaires
    ]);
    
    return userCategoryStats;
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories populaires:', error);
    return [];
  }
}

// Fonction pour obtenir les catégories les plus populaires globalement
async function getGlobalTopCategories() {
  try {
    // Aggrégation pour trouver les catégories avec le plus de réservations globalement
    const globalCategoryStats = await Reservation.aggregate([
      { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $group: {
          _id: '$service.category',
          count: { $sum: 1 },
          services: { $push: '$service._id' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 } // Limiter aux 3 catégories les plus populaires
    ]);
    
    return globalCategoryStats;
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories populaires globales:', error);
    return [];
  }
}

// Fonction pour obtenir 2 services par catégorie
async function getServicesForCategories(categories) {
  try {
    const recommendedServices = [];
    
    for (const category of categories) {
      // Récupérer 2 services les mieux notés pour cette catégorie
      const services = await Service.find({ 
        category: category._id,
        availability: 'available' // S'assurer que le service est disponible
      })
      .sort({ averageRating: -1, totalRatings: -1 }) // Trier par meilleure note et nombre de notes
      .limit(2) // Limiter à 2 services par catégorie
      .populate('category', 'name description')
      .populate('subCategory', 'name description')
      .populate('prestataireId', 'nom prenom email telephone adresse photoProfil');
      
      // Ajouter les services à la liste de recommandations
      services.forEach(service => {
        recommendedServices.push({
          service: service,
          score: 1.0, // Score par défaut
          categoryCount: category.count || 0 // Nombre de réservations dans cette catégorie
        });
      });
    }
    
    return recommendedServices;
  } catch (error) {
    console.error('Erreur lors de la récupération des services par catégorie:', error);
    return [];
  }
}

router.get('/', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    let recommendedServicesWithDetails = [];
    
    // 1. Récupérer les réservations de l'utilisateur
    const reservations = await Reservation.find({ userId: userId }).populate('serviceId');
    const reservationTitles = reservations
      .map(r => r.serviceId?.name)
      .filter(Boolean);
    
    // Garder une trace des services déjà réservés pour ne pas les recommander
    const reservedServiceIds = reservations
      .map(r => r.serviceId?._id.toString())
      .filter(Boolean);
    
    // 2. Récupérer les catégories les plus populaires pour cet utilisateur
    let topCategories = await getUserTopCategories(userId);
    
    // 3. Si l'utilisateur n'a pas de réservations ou pas assez de catégories, utiliser les catégories populaires globales
    if (topCategories.length < 3) {
      const globalCategories = await getGlobalTopCategories();
      
      // Filtrer pour ne pas avoir de doublons
      const existingCategoryIds = topCategories.map(cat => cat._id.toString());
      const additionalCategories = globalCategories.filter(
        cat => !existingCategoryIds.includes(cat._id.toString())
      );
      
      // Ajouter les catégories manquantes
      topCategories = [...topCategories, ...additionalCategories.slice(0, 3 - topCategories.length)];
    }
    
    // 4. Récupérer 2 services pour chacune des 3 catégories les plus populaires
    const categoryBasedRecommendations = await getServicesForCategories(topCategories);
    
    // Filtrer pour exclure les services déjà réservés
    const filteredCategoryRecommendations = categoryBasedRecommendations.filter(
      rec => !reservedServiceIds.includes(rec.service._id.toString())
    );
    
    recommendedServicesWithDetails = filteredCategoryRecommendations;
    
    // 5. Si nous avons des réservations, utiliser le service de recommandation basé sur la similarité
    if (reservationTitles.length > 0) {
      try {
        const response = await axios.post(`${recommenderUrl}/recommend`, {
          userId: userId,
          reservations: reservationTitles,
          categories: topCategories.map(cat => ({ _id: cat._id, count: cat.count }))
        });
        
        // Récupérer les recommandations basées sur la similarité
        const similarityRecommendations = response.data.recommendations || [];
        
        // Récupérer les détails des services recommandés par similarité
        if (similarityRecommendations.length > 0) {
          const serviceIds = similarityRecommendations.map(rec => rec.service._id);
          const similarServicesDetails = await Service.find({ 
            _id: { $in: serviceIds },
            _id: { $nin: reservedServiceIds }, // Exclure les services déjà réservés
            availability: 'available' // S'assurer que le service est disponible
          })
            .populate('category', 'name description')
            .populate('subCategory', 'name description')
            .populate('prestataireId', 'nom prenom email telephone adresse photoProfil');
          
          // Combiner les scores avec les détails des services
          const similarServicesWithDetails = similarServicesDetails.map(service => {
            const recommendation = similarityRecommendations.find(rec => rec.service._id === service._id.toString());
            return {
              service: service,
              score: recommendation ? recommendation.score : 0,
              similarTo: recommendation ? recommendation.similar_to : null, // Indiquer à quel service réservé celui-ci est similaire
              fromSimilarity: true
            };
          });
          
          // Ajouter ces services à notre liste de recommandations
          recommendedServicesWithDetails = [...recommendedServicesWithDetails, ...similarServicesWithDetails];
        }
      } catch (similarityError) {
        console.error('Erreur avec le service de similarité:', similarityError.message);
        // Continuer avec seulement les recommandations basées sur les catégories
      }
    }
    
    // 6. Éliminer les doublons
    const uniqueServices = [];
    const serviceIds = new Set();
    
    for (const rec of recommendedServicesWithDetails) {
      if (!serviceIds.has(rec.service._id.toString())) {
        serviceIds.add(rec.service._id.toString());
        uniqueServices.push(rec);
      }
    }
    
    // 7. Trier les recommandations (priorité aux services similaires, puis par score)
    uniqueServices.sort((a, b) => {
      // Priorité aux services similaires
      if (a.fromSimilarity && !b.fromSimilarity) return -1;
      if (!a.fromSimilarity && b.fromSimilarity) return 1;
      // Ensuite par score
      return b.score - a.score;
    });
    
    // 8. Limiter à 6 services au total ou compléter avec des services aléatoires
    let finalRecommendations = uniqueServices.slice(0, 6);
    
    // Si nous avons moins de 6 services, ajouter des services aléatoires
    if (finalRecommendations.length < 6) {
      // Récupérer les IDs des services déjà recommandés pour les exclure
      const recommendedIds = new Set(finalRecommendations.map(rec => rec.service._id.toString()));
      
      // Ajouter aussi les services déjà réservés à exclure
      reservedServiceIds.forEach(id => recommendedIds.add(id));
      
      // Récupérer des services aléatoires qui ne sont pas déjà recommandés ou réservés
      const randomServices = await Service.find({
        _id: { $nin: Array.from(recommendedIds) },
        availability: 'available'
      })
      .sort({ averageRating: -1 }) // Prioriser les services bien notés
      .limit(6 - finalRecommendations.length) // Récupérer seulement le nombre nécessaire
      .populate('category', 'name description')
      .populate('subCategory', 'name description')
      .populate('prestataireId', 'nom prenom email telephone adresse photoProfil');
      
      // Ajouter ces services aléatoires à nos recommandations
      const randomRecommendations = randomServices.map(service => ({
        service,
        score: 0.5, // Score par défaut plus bas que les recommandations principales
        categoryCount: 0,
        fromRandom: true // Marquer comme aléatoire
      }));
      
      finalRecommendations = [...finalRecommendations, ...randomRecommendations];
    }
    
    return res.json({ recommendedServices: finalRecommendations });

  } catch (error) {
    console.error('Erreur recommendation:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la recommandation' });
  }
});

module.exports = router;