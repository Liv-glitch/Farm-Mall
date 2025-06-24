import { WeatherRequest, WeatherResponse } from '../types/ai.types';
import { redisClient } from '../config/redis';
import { ERROR_CODES, CACHE_KEYS } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';

interface WeatherApiResponse {
  current: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    condition: string;
    icon: string;
  };
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
  };
}

interface ForecastApiResponse {
  forecast: Array<{
    date: string;
    temperature: {
      min: number;
      max: number;
    };
    humidity: number;
    condition: string;
    chanceOfRain: number;
    windSpeed: number;
  }>;
}

export class WeatherService {
  private readonly CACHE_DURATION = 30 * 60; // 30 minutes
  private readonly FORECAST_CACHE_DURATION = 6 * 60 * 60; // 6 hours

  // Get current weather
  async getCurrentWeather(request: WeatherRequest): Promise<WeatherResponse> {
    try {
      const cacheKey = `${CACHE_KEYS.WEATHER_DATA}current:${request.latitude}:${request.longitude}`;
      
      // Try to get from cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logInfo('Weather data served from cache', { latitude: request.latitude, longitude: request.longitude });
        return JSON.parse(cached);
      }

      // Fetch from weather API
      const weatherData = await this.fetchCurrentWeatherFromApi(request.latitude, request.longitude);
      
      // Transform to our response format
      const response: WeatherResponse = {
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
          name: weatherData.location.name,
          region: weatherData.location.region,
        },
        current: {
          temperature: weatherData.current.temperature,
          humidity: weatherData.current.humidity,
          pressure: weatherData.current.pressure,
          windSpeed: weatherData.current.windSpeed,
          condition: weatherData.current.condition,
          icon: weatherData.current.icon,
        },
        forecast: [],
        seasonalInsights: {
          rainySeasonStart: new Date(),
          rainySeasonEnd: new Date(),
          drySeasonConditions: 'Hot and dry',
          optimalPlantingWindows: []
        },
        alerts: [],
        updatedAt: new Date(),
      };

      // Cache the response
      await redisClient.set(cacheKey, JSON.stringify(response), this.CACHE_DURATION);

      logInfo('Current weather data fetched', { 
        latitude: request.latitude, 
        longitude: request.longitude,
        temperature: response.current.temperature 
      });

      return response;
    } catch (error) {
      logError('Failed to get current weather', error as Error, request);
      throw new Error(ERROR_CODES.WEATHER_DATA_UNAVAILABLE);
    }
  }

  // Get weather forecast
  async getWeatherForecast(
    request: WeatherRequest,
    days = 7
  ): Promise<any> {
    try {
      const cacheKey = `${CACHE_KEYS.WEATHER_DATA}forecast:${request.latitude}:${request.longitude}:${days}`;
      
      // Try to get from cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logInfo('Weather forecast served from cache', { 
          latitude: request.latitude, 
          longitude: request.longitude, 
          days 
        });
        return JSON.parse(cached);
      }

      // Fetch from weather API
      const forecastData = await this.fetchForecastFromApi(request.latitude, request.longitude, days);
      
      // Transform to our response format
      const response: any = {
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
          name: `Location (${request.latitude}, ${request.longitude})`,
          region: 'Kenya',
        },
        forecast: forecastData.forecast.map(day => ({
          date: day.date,
          temperature: day.temperature,
          humidity: day.humidity,
          condition: day.condition,
          chanceOfRain: day.chanceOfRain,
          windSpeed: day.windSpeed,
          agricultural: {
            plantingCondition: this.assessPlantingCondition(day),
            irrigationRecommendation: this.getIrrigationRecommendation(day),
            pestRisk: this.assessPestRisk(day),
            diseaseRisk: this.assessDiseaseRisk(day),
          },
        })),
        timestamp: new Date().toISOString(),
        source: 'weather_api',
      };

      // Cache the response
      await redisClient.set(cacheKey, JSON.stringify(response), this.FORECAST_CACHE_DURATION);

      logInfo('Weather forecast fetched', { 
        latitude: request.latitude, 
        longitude: request.longitude,
        days,
        forecastDays: response.forecast.length 
      });

      return response;
    } catch (error) {
      logError('Failed to get weather forecast', error as Error, { ...request, days });
      throw new Error(ERROR_CODES.WEATHER_DATA_UNAVAILABLE);
    }
  }

  // Get historical weather (for analytics)
  async getHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    data: Array<{
      date: string;
      temperature: { min: number; max: number; avg: number };
      humidity: number;
      rainfall: number;
      condition: string;
    }>;
    summary: {
      avgTemperature: number;
      totalRainfall: number;
      avgHumidity: number;
      dryDays: number;
      rainyDays: number;
    };
  }> {
    try {
      // This would integrate with historical weather APIs
      // For now, generate sample data
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const data = [];
      let totalTemp = 0;
      let totalRainfall = 0;
      let totalHumidity = 0;
      let rainyDays = 0;

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const temp = 20 + Math.random() * 15; // 20-35°C
        const humidity = 40 + Math.random() * 40; // 40-80%
        const rainfall = Math.random() > 0.7 ? Math.random() * 20 : 0; // 30% chance of rain
        
        if (rainfall > 0) rainyDays++;
        
        totalTemp += temp;
        totalRainfall += rainfall;
        totalHumidity += humidity;

        data.push({
          date: date.toISOString().split('T')[0],
          temperature: {
            min: temp - 5,
            max: temp + 5,
            avg: temp,
          },
          humidity,
          rainfall,
          condition: rainfall > 0 ? 'Rainy' : temp > 30 ? 'Hot' : 'Mild',
        });
      }

      const summary = {
        avgTemperature: totalTemp / days,
        totalRainfall,
        avgHumidity: totalHumidity / days,
        dryDays: days - rainyDays,
        rainyDays,
      };

      logInfo('Historical weather data generated', { 
        latitude, 
        longitude, 
        days,
        summary 
      });

      return { data, summary };
    } catch (error) {
      logError('Failed to get historical weather', error as Error, { 
        latitude, 
        longitude, 
        startDate, 
        endDate 
      });
      throw new Error(ERROR_CODES.WEATHER_DATA_UNAVAILABLE);
    }
  }

  // Private methods for API integration
  private async fetchCurrentWeatherFromApi(_latitude: number, _longitude: number): Promise<WeatherApiResponse> {
    // TODO: Integrate with actual weather API (OpenWeatherMap, WeatherAPI, etc.)
    // For now, return mock data
    return {
      current: {
        temperature: 25 + Math.random() * 10,
        humidity: 60 + Math.random() * 20,
        pressure: 1013 + Math.random() * 20,
        windSpeed: 5 + Math.random() * 10,
        windDirection: Math.random() * 360,
        condition: 'Partly Cloudy',
        icon: '02d',
      },
      location: {
        name: 'Nakuru',
        region: 'Nakuru County',
        country: 'Kenya',
        lat: _latitude,
        lon: _longitude,
      },
    };
  }

  private async fetchForecastFromApi(
    _latitude: number, 
    _longitude: number, 
    days: number
  ): Promise<ForecastApiResponse> {
    // TODO: Integrate with actual weather API
    // For now, return mock data
    const forecast = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        temperature: {
          min: 18 + Math.random() * 5,
          max: 28 + Math.random() * 7,
        },
        humidity: 50 + Math.random() * 30,
        condition: Math.random() > 0.3 ? 'Sunny' : 'Cloudy',
        chanceOfRain: Math.random() * 100,
        windSpeed: 3 + Math.random() * 8,
      });
    }

    return { forecast };
  }

  // Agricultural analysis methods (disabled to avoid unused method warning)
  /*
  private calculateAgriculturalIndices(weather: any) {
    return {
      heatStressIndex: this.calculateHeatStress(weather.temperature, weather.humidity),
      evapotranspirationRate: this.calculateEvapotranspiration(weather.temperature, weather.humidity, weather.windSpeed),
      soilMoistureIndex: this.calculateSoilMoistureIndex(weather.humidity, weather.pressure),
      plantingCondition: this.assessPlantingCondition(weather),
    };
  }
  */

  /*
  private calculateHeatStress(temperature: number, humidity: number): string {
    const heatIndex = temperature + (0.33 * humidity) - 0.7;
    if (heatIndex > 35) return 'high';
    if (heatIndex > 30) return 'moderate';
    return 'low';
  }

  private calculateEvapotranspiration(temperature: number, humidity: number, windSpeed: number): number {
    // Simplified Penman equation
    return Math.max(0, (temperature - 5) * 0.1 + windSpeed * 0.05 - humidity * 0.001);
  }

  private calculateSoilMoistureIndex(humidity: number, pressure: number): string {
    const moistureIndex = (humidity / 100) * (pressure / 1013);
    if (moistureIndex > 0.8) return 'high';
    if (moistureIndex > 0.6) return 'moderate';
    return 'low';
  }
  */

  private assessPlantingCondition(weather: any): string {
    if (weather.temperature?.max > 35 || weather.temperature?.min < 10) return 'poor';
    if (weather.chanceOfRain > 80 || weather.humidity < 30) return 'fair';
    return 'good';
  }

  private getIrrigationRecommendation(weather: any): string {
    if (weather.chanceOfRain > 60) return 'not_needed';
    if (weather.humidity < 40 && weather.temperature?.max > 30) return 'high_priority';
    if (weather.humidity < 60) return 'moderate_priority';
    return 'low_priority';
  }

  private assessPestRisk(weather: any): string {
    // High humidity and moderate temperatures increase pest risk
    if (weather.humidity > 70 && weather.temperature?.max > 25 && weather.temperature?.max < 32) {
      return 'high';
    }
    if (weather.humidity > 60 && weather.temperature?.max > 20) {
      return 'moderate';
    }
    return 'low';
  }

  private assessDiseaseRisk(weather: any): string {
    // High humidity and rainfall increase disease risk
    if (weather.humidity > 80 || weather.chanceOfRain > 70) {
      return 'high';
    }
    if (weather.humidity > 65 || weather.chanceOfRain > 40) {
      return 'moderate';
    }
    return 'low';
  }
} 