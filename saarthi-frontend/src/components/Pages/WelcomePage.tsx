// src/components/Pages/WelcomePage.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Users, 
  FileText, 
  Zap, 
  Shield, 
  Heart,
  ArrowRight,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface WelcomePageProps {
  onPageChange?: (page: string, data?: any) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onPageChange }) => {
  
  const features = [
    {
      icon: <Mic className="h-6 w-6 text-blue-500" />,
      title: "Voice-First Experience",
      description: "Talk naturally - no typing needed. Just speak and I'll understand.",
      color: "blue"
    },
    {
      icon: <Users className="h-6 w-6 text-green-500" />,
      title: "Personalized Matching",
      description: "Get schemes tailored to your income, location, and family situation.",
      color: "green"
    },
    {
      icon: <FileText className="h-6 w-6 text-purple-500" />,
      title: "Automatic Applications",
      description: "I'll fill out government forms for you - completely hands-free.",
      color: "purple"
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-500" />,
      title: "Instant Results",
      description: "Find eligible schemes in minutes, not hours of research.",
      color: "yellow"
    }
  ];

  const benefits = [
    "₹6,000/year from PM Kisan for farmers",
    "₹5 lakh health insurance from Ayushman Bharat", 
    "₹2.5 lakh housing subsidy for first-time buyers",
    "Monthly pension for senior citizens",
    "Business loans up to ₹10 lakh without collateral"
  ];

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-6 py-2 mb-8 border border-white/20">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">AI-Powered Government Assistant</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Meet{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Saarthi
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Your personal AI assistant for discovering and applying to government schemes. 
            <span className="font-semibold text-gray-800"> Completely voice-controlled, completely free.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="saarthi-gradient text-white px-8 py-4 text-lg font-semibold hover:shadow-xl transition-all duration-300"
              onClick={() => onPageChange?.('onboarding')}
            >
              <Mic className="mr-3 h-5 w-5" />
              Start Voice Onboarding
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-4 text-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              onClick={() => onPageChange?.('schemes')}
            >
              Browse Schemes
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <div className="text-sm text-gray-600">Government Schemes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">₹50K+</div>
              <div className="text-sm text-gray-600">Average Benefits</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">5 min</div>
              <div className="text-sm text-gray-600">Profile Setup</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-gray-600">Voice Controlled</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 rounded-full bg-${feature.color}-100 flex items-center justify-center mx-auto mb-4`}>
                  {feature.icon}
                </div>
                <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="mb-16 border-0 shadow-xl bg-gradient-to-r from-green-50 to-blue-50">
          <CardHeader className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 rounded-full px-4 py-2 mb-4">
              <Heart className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Life-Changing Benefits</span>
            </div>
            <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Discover Benefits Worth Lakhs
            </CardTitle>
            <CardDescription className="text-lg text-gray-700 max-w-2xl mx-auto">
              Real government schemes that can transform your financial future
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-white/60 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">How Saarthi Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="relative">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Talk to Saarthi</h3>
              <p className="text-gray-600">
                Just speak naturally about yourself - your work, income, family, and location.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform translate-x-4"></div>
            </div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Matched</h3>
              <p className="text-gray-600">
                AI analyzes your profile and finds government schemes you're eligible for.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-500 to-green-500 transform translate-x-4"></div>
            </div>
            
            <div>
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Apply Automatically</h3>
              <p className="text-gray-600">
                Saarthi fills out applications for you and tracks their progress.
              </p>
            </div>
          </div>
        </div>

        {/* Trust & Security */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Completely Safe & Secure</h3>
            <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
              Your personal information is encrypted and stored securely. We only use official government websites and never share your data with third parties.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Shield className="w-3 h-3 mr-1" />
                Encrypted Storage
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="w-3 h-3 mr-1" />
                Official Portals Only
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Heart className="w-3 h-3 mr-1" />
                100% Free
              </Badge>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default WelcomePage;
