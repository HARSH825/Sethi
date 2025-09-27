// src/components/Pages/RecommendationsPage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Mic,
  ArrowRight,
  Users,
  Calendar,
  MapPin,
  IndianRupee,
  FileText,
  Sparkles,
  Trophy
} from 'lucide-react';

import { SchemeRecommendation, UserProfile } from '@/types';
import apiService from '@/services/apiService';

interface RecommendationsPageProps {
  pageData?: {
    userId?: string;
    recommendations?: SchemeRecommendation[];
  };
  userProfile?: UserProfile | null;
  onPageChange?: (page: string, data?: any) => void;
}

const RecommendationsPage: React.FC<RecommendationsPageProps> = ({ 
  pageData, 
  userProfile, 
  onPageChange 
}) => {
  const [recommendations, setRecommendations] = useState<SchemeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [pageData?.userId]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (pageData?.recommendations) {
        // Use recommendations passed from onboarding
        setRecommendations(pageData.recommendations);
      } else if (pageData?.userId) {
        // Fetch recommendations from API
        const result = await apiService.getRecommendations(pageData.userId);
        if (result.success) {
          setRecommendations(result.recommendations);
        } else {
          throw new Error(result.message || 'Failed to load recommendations');
        }
      } else {
        // Fallback: load general schemes
        const result = await apiService.getSchemes();
        if (result.success) {
          // Convert schemes to recommendations format
          const mockRecommendations = result.schemes.slice(0, 6).map((scheme: any) => ({
            ...scheme,
            relevanceScore: Math.random() * 10,
            eligibilityStatus: {
              eligible: Math.random() > 0.3,
              status: Math.random() > 0.3 ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
              reasons: ['Profile analysis needed'],
              confidence: 0.7
            }
          }));
          setRecommendations(mockRecommendations);
        }
      }
    } catch (err) {
      console.error('❌ Load recommendations failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const getEligibilityBadge = (status: SchemeRecommendation['eligibilityStatus']) => {
    if (status.eligible) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Eligible
        </Badge>
      );
    } else if (status.status === 'PARTIALLY_ELIGIBLE') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Partially Eligible
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Not Eligible
        </Badge>
      );
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 lg:p-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardHeader>
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 lg:p-12 flex items-center justify-center">
        <Card className="max-w-md mx-auto border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Recommendations</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={loadRecommendations} variant="outline" className="border-red-300 text-red-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-6 py-2 mb-6 border border-white/20">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Personalized for You</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Scheme Recommendations
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {userProfile ? (
              <>Hi {userProfile.name}! I found <strong>{recommendations.length} schemes</strong> that match your profile.</>
            ) : (
              <>I found <strong>{recommendations.length} government schemes</strong> you might be eligible for.</>
            )}
          </p>

          {/* User Summary */}
          {userProfile && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {userProfile.location?.state && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {userProfile.location.state}
                </Badge>
              )}
              {userProfile.income && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                  <IndianRupee className="w-3 h-3 mr-1" />
                  ₹{userProfile.income.toLocaleString()}/month
                </Badge>
              )}
              {userProfile.family_size && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                  <Users className="w-3 h-3 mr-1" />
                  {userProfile.family_size} members
                </Badge>
              )}
              {userProfile.occupation && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 px-3 py-1">
                  <FileText className="w-3 h-3 mr-1" />
                  {userProfile.occupation}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Voice Interaction Prompt */}
        <Card className="mb-12 border-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Mic className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Try Voice Commands</h3>
                  <p className="text-blue-100 text-sm">
                    Say "Tell me about PM Kisan" or "Apply for housing scheme"
                  </p>
                </div>
              </div>
              <Button variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Mic className="w-4 h-4 mr-2" />
                Try Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {recommendations.map((scheme, index) => (
            <Card 
              key={scheme.id} 
              className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                scheme.eligibilityStatus.eligible 
                  ? 'ring-2 ring-green-200 bg-green-50/30' 
                  : 'bg-white'
              }`}
              onClick={() => onPageChange?.('scheme-details', { schemeId: scheme.id, userId: userProfile?.id })}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  {getEligibilityBadge(scheme.eligibilityStatus)}
                  <div className="flex items-center gap-1">
                    <Trophy className={`h-4 w-4 ${getRelevanceColor(scheme.relevanceScore)}`} />
                    <span className={`text-sm font-medium ${getRelevanceColor(scheme.relevanceScore)}`}>
                      {scheme.relevanceScore.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <CardTitle className="text-lg leading-tight group-hover:text-blue-600 transition-colors">
                  {scheme.title}
                </CardTitle>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{scheme.agency}</span>
                  <Badge variant="outline" className="text-xs">
                    <IndianRupee className="w-3 h-3 mr-1" />
                    ₹{scheme.benefitAmount.toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <CardDescription className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                  {scheme.description}
                </CardDescription>

                {/* Relevance Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Relevance Match</span>
                    <span>{Math.round(scheme.relevanceScore * 10)}%</span>
                  </div>
                  <Progress 
                    value={scheme.relevanceScore * 10} 
                    className="h-2"
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {scheme.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="secondary" className="text-xs px-2 py-0.5">
                      {tag.replace('_', ' ')}
                    </Badge>
                  ))}
                  {scheme.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      +{scheme.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 text-sm"
                    variant={scheme.eligibilityStatus.eligible ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPageChange?.('scheme-details', { schemeId: scheme.id, userId: userProfile?.id });
                    }}
                  >
                    {scheme.eligibilityStatus.eligible ? 'Apply Now' : 'View Details'}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(scheme.applicationUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {recommendations.length === 0 && (
          <Card className="max-w-md mx-auto border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
              <p className="text-gray-600 mb-4">
                Complete your profile to get personalized scheme recommendations.
              </p>
              <Button onClick={() => onPageChange?.('welcome')}>
                <Users className="w-4 h-4 mr-2" />
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer CTA */}
        <div className="text-center mt-16">
          <Card className="inline-block border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">Need Help Choosing?</h3>
              <p className="text-gray-600 mb-4">
                Use voice commands to ask Saarthi about any scheme or get personalized advice.
              </p>
              <Button className="saarthi-gradient text-white">
                <Mic className="w-4 h-4 mr-2" />
                Ask Saarthi
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default RecommendationsPage;
