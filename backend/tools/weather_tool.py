from .base import BaseTool, ToolResult


class WeatherTool(BaseTool):
    """Get current weather for a city (mock data for demo)."""

    name = "weather_api"
    description = "Get current weather data for a city including temperature, condition, and humidity"

    async def _get_coordinates(self, city: str) -> tuple[float, float, str]:
        """Convert city name to lat/lon using Open-Meteo Geocoding API."""
        import httpx
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            
            if not data.get("results"):
                raise ValueError(f"Could not find coordinates for city: {city}")
                
            result = data["results"][0]
            return result["latitude"], result["longitude"], result["name"]

    def _clean_city_name(self, raw: str) -> str:
        """Strip out non-city noise words from the city parameter."""
        import re
        # Remove common noise phrases the LLM might leave in
        noise = [
            r'\bair quality index\b', r'\baqi\b', r'\bweather\b', r'\btemperature\b',
            r'\bforecast\b', r'\bhumidity\b', r'\bcondition\b', r'\bof\b', r'\bin\b',
            r'\bfor\b', r'\bthe\b', r'\bwhat\s*is\b', r'\bhow\s*is\b', r'\bget\b',
            r'\band\b', r'\bthere\b', r'\btoday\b', r'\bcurrent\b', r'\bnow\b',
        ]
        cleaned = raw
        for pattern in noise:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        # Clean up extra whitespace and punctuation
        cleaned = re.sub(r'[?,!.]', '', cleaned).strip()
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned or raw  # Fall back to original if nothing left

    async def execute(self, parameters: dict) -> ToolResult:
        import httpx
        city_query = self._clean_city_name(parameters.get("city", ""))
        
        if not city_query or city_query == "Unknown":
            return ToolResult(success=False, data={}, error="No city provided")

        try:
            # 1. Get coordinates
            lat, lon, real_city_name = await self._get_coordinates(city_query)
            
            # 2. Get weather (current + hourly)
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                weather_data = response.json()
                
                current = weather_data.get("current", {})
                
                # Basic weather code mapping (WMO codes)
                code = current.get("weather_code", 0)
                condition = "Clear"
                if code in [1, 2, 3]: condition = "Cloudy"
                elif code in [45, 48]: condition = "Foggy"
                elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]: condition = "Rainy"
                elif code in [71, 73, 75, 85, 86]: condition = "Snowy"
                elif code in [95, 96, 99]: condition = "Thunderstorm"

                result = {
                    "city": real_city_name,
                    "temperature": current.get("temperature_2m"),
                    "condition": condition,
                    "humidity": current.get("relative_humidity_2m"),
                    "wind_speed": current.get("wind_speed_10m"),
                    "source": "open_meteo_api",
                }

                return ToolResult(success=True, data=result)
                
        except Exception as e:
            return ToolResult(success=False, data={"city": city_query}, error=str(e))

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name to get weather for"}
            },
            "required": ["city"],
        }
