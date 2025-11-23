import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet";

const BlogArticlePage = () => {
  const { slug } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Article content database
  const articlesContent: Record<string, any> = {
    "dicas-de-forca-para-corredores": {
      pt: {
        title: "Dicas de Força para Corredores",
        category: "Força",
        readTime: "5 min",
        image: "/lovable-uploads/bg-1.png",
        content: `
          <h2>Por que Corredores Precisam de Treino de Força?</h2>
          <p>Muitos corredores acreditam que apenas correr é suficiente para melhorar a performance. No entanto, o treino de força é fundamental para:</p>
          <ul>
            <li><strong>Prevenir lesões</strong> - Fortalece músculos, tendões e ligamentos</li>
            <li><strong>Melhorar economia de corrida</strong> - Cada passada se torna mais eficiente</li>
            <li><strong>Aumentar velocidade</strong> - Mais força = mais potência na passada</li>
            <li><strong>Melhorar postura</strong> - Core forte mantém forma técnica por mais tempo</li>
          </ul>

          <h2>Exercícios Essenciais para Corredores</h2>
          
          <h3>1. Agachamento</h3>
          <p>O agachamento fortalece quadríceps, glúteos e core. Execute 3 séries de 12-15 repetições, 2x por semana.</p>
          
          <h3>2. Avanço (Lunges)</h3>
          <p>Trabalha equilíbrio e força unilateral. Essencial para corrigir desbalanços musculares.</p>
          
          <h3>3. Levantamento Terra Romeno</h3>
          <p>Fortalece posterior de coxa e glúteos - músculos cruciais para propulsão na corrida.</p>
          
          <h3>4. Prancha e Variações</h3>
          <p>Core forte é fundamental. Mantenha 3x 45-60 segundos com boa forma.</p>

          <h2>Como Integrar no Seu Treino</h2>
          <p>Faça 2 sessões de força por semana, preferencialmente após treinos leves de corrida ou em dias separados. Priorize qualidade de movimento sobre carga.</p>

          <p><strong>Lembre-se:</strong> A consistência no treino de força trará resultados significativos em 8-12 semanas.</p>
        `
      },
      en: {
        title: "Strength Tips for Runners",
        category: "Strength",
        readTime: "5 min",
        image: "/lovable-uploads/bg-1.png",
        content: `
          <h2>Why Runners Need Strength Training?</h2>
          <p>Many runners believe that just running is enough to improve performance. However, strength training is essential for:</p>
          <ul>
            <li><strong>Injury prevention</strong> - Strengthens muscles, tendons and ligaments</li>
            <li><strong>Improved running economy</strong> - Each stride becomes more efficient</li>
            <li><strong>Increased speed</strong> - More strength = more power in stride</li>
            <li><strong>Better posture</strong> - Strong core maintains technical form longer</li>
          </ul>

          <h2>Essential Exercises for Runners</h2>
          
          <h3>1. Squats</h3>
          <p>Squats strengthen quadriceps, glutes and core. Perform 3 sets of 12-15 reps, 2x per week.</p>
          
          <h3>2. Lunges</h3>
          <p>Works balance and unilateral strength. Essential for correcting muscle imbalances.</p>
          
          <h3>3. Romanian Deadlift</h3>
          <p>Strengthens hamstrings and glutes - crucial muscles for running propulsion.</p>
          
          <h3>4. Plank and Variations</h3>
          <p>Strong core is fundamental. Hold 3x 45-60 seconds with good form.</p>

          <h2>How to Integrate Into Your Training</h2>
          <p>Do 2 strength sessions per week, preferably after easy runs or on separate days. Prioritize movement quality over load.</p>

          <p><strong>Remember:</strong> Consistency in strength training will bring significant results in 8-12 weeks.</p>
        `
      }
    },
    "mobilidade-para-triatletas": {
      pt: {
        title: "Mobilidade para Triatletas",
        category: "Mobilidade",
        readTime: "6 min",
        image: "/lovable-uploads/murillo.png",
        content: `
          <h2>A Importância da Mobilidade no Triatlo</h2>
          <p>Triatletas enfrentam um desafio único: três modalidades com demandas diferentes de mobilidade. Trabalhar mobilidade melhora:</p>
          <ul>
            <li>Eficiência técnica em cada modalidade</li>
            <li>Prevenção de lesões por overuse</li>
            <li>Amplitude de movimento e potência</li>
            <li>Recuperação entre treinos</li>
          </ul>

          <h2>Rotina de Mobilidade para Natação</h2>
          <h3>Ombros e Torácico</h3>
          <p>Execute rotações de ombro, alongamento de peitorais e mobilidade torácica 10 minutos antes de nadar.</p>

          <h2>Mobilidade para Ciclismo</h2>
          <h3>Quadril e Posterior</h3>
          <p>Foco em flexores de quadril, glúteos e isquiotibiais. 90 graus de flexão sustentada ajuda na posição aero.</p>

          <h2>Mobilidade para Corrida</h2>
          <h3>Tornozelos e Panturrilhas</h3>
          <p>Dorsiflexão adequada previne lesões. Faça mobilidade de tornozelo 3x por semana.</p>

          <h2>Protocolo Diário (15 minutos)</h2>
          <p>1. Cat-Cow: 10 repetições<br>
          2. 90/90 Hip Stretch: 60s cada lado<br>
          3. Thoracic Rotation: 10 cada lado<br>
          4. Calf Raises + Dorsiflexion: 15 reps<br>
          5. Shoulder Circles: 20 each direction</p>
        `
      },
      en: {
        title: "Mobility for Triathletes",
        category: "Mobility",
        readTime: "6 min",
        image: "/lovable-uploads/murillo.png",
        content: `
          <h2>The Importance of Mobility in Triathlon</h2>
          <p>Triathletes face a unique challenge: three disciplines with different mobility demands. Working on mobility improves:</p>
          <ul>
            <li>Technical efficiency in each discipline</li>
            <li>Prevention of overuse injuries</li>
            <li>Range of motion and power</li>
            <li>Recovery between workouts</li>
          </ul>

          <h2>Mobility Routine for Swimming</h2>
          <h3>Shoulders and Thoracic</h3>
          <p>Perform shoulder rotations, pectoral stretches and thoracic mobility 10 minutes before swimming.</p>

          <h2>Mobility for Cycling</h2>
          <h3>Hip and Posterior Chain</h3>
          <p>Focus on hip flexors, glutes and hamstrings. 90-degree sustained flexion helps with aero position.</p>

          <h2>Mobility for Running</h2>
          <h3>Ankles and Calves</h3>
          <p>Adequate dorsiflexion prevents injuries. Do ankle mobility 3x per week.</p>

          <h2>Daily Protocol (15 minutes)</h2>
          <p>1. Cat-Cow: 10 reps<br>
          2. 90/90 Hip Stretch: 60s each side<br>
          3. Thoracic Rotation: 10 each side<br>
          4. Calf Raises + Dorsiflexion: 15 reps<br>
          5. Shoulder Circles: 20 each direction</p>
        `
      }
    },
    "como-evitar-lesoes": {
      pt: {
        title: "Como Evitar Lesões",
        category: "Prevenção",
        readTime: "7 min",
        image: "/lovable-uploads/ba2184b9-65d7-4393-87da-9d1999bc5169.png",
        content: `
          <h2>Estratégias Comprovadas de Prevenção</h2>
          <p>Lesões interrompem progressão e podem afastar atletas por meses. Prevenir é sempre melhor que remediar.</p>

          <h2>1. Progressão Gradual é Fundamental</h2>
          <p><strong>Regra dos 10%:</strong> Não aumente volume semanal em mais de 10%. Seu corpo precisa adaptar-se gradualmente.</p>

          <h2>2. Respeite a Recuperação</h2>
          <ul>
            <li>Durma 7-9 horas por noite</li>
            <li>Inclua dias de descanso ativo</li>
            <li>Faça pelo menos 1 dia completo off por semana</li>
            <li>Monitore sinais de overtraining</li>
          </ul>

          <h2>3. Trabalho de Força Preventivo</h2>
          <p>Músculos fortes absorvem impacto e protegem articulações. Foco em:</p>
          <ul>
            <li>Core stability</li>
            <li>Força unilateral</li>
            <li>Fortalecimento de tendões</li>
            <li>Exercícios excêntricos</li>
          </ul>

          <h2>4. Escute Seu Corpo</h2>
          <p>Dor não é normal. Desconforto muscular pós-treino (DOMS) é normal, dor aguda não é.</p>
          <p><strong>Sinais de alerta:</strong></p>
          <ul>
            <li>Dor que piora durante atividade</li>
            <li>Dor que altera sua biomecânica</li>
            <li>Inchaço ou vermelhidão</li>
            <li>Dor noturna que atrapalha sono</li>
          </ul>

          <h2>5. Invista em Equipamento Adequado</h2>
          <p>Tênis apropriados ao seu tipo de pisada, bicicleta com bike fit correto e equipamentos de natação adequados fazem diferença.</p>
        `
      },
      en: {
        title: "How to Avoid Injuries",
        category: "Prevention",
        readTime: "7 min",
        image: "/lovable-uploads/ba2184b9-65d7-4393-87da-9d1999bc5169.png",
        content: `
          <h2>Proven Prevention Strategies</h2>
          <p>Injuries interrupt progression and can sideline athletes for months. Prevention is always better than cure.</p>

          <h2>1. Gradual Progression is Key</h2>
          <p><strong>10% Rule:</strong> Don't increase weekly volume by more than 10%. Your body needs to adapt gradually.</p>

          <h2>2. Respect Recovery</h2>
          <ul>
            <li>Sleep 7-9 hours per night</li>
            <li>Include active recovery days</li>
            <li>Take at least 1 complete day off per week</li>
            <li>Monitor overtraining signs</li>
          </ul>

          <h2>3. Preventive Strength Work</h2>
          <p>Strong muscles absorb impact and protect joints. Focus on:</p>
          <ul>
            <li>Core stability</li>
            <li>Unilateral strength</li>
            <li>Tendon strengthening</li>
            <li>Eccentric exercises</li>
          </ul>

          <h2>4. Listen to Your Body</h2>
          <p>Pain is not normal. Post-workout muscle soreness (DOMS) is normal, acute pain is not.</p>
          <p><strong>Warning signs:</strong></p>
          <ul>
            <li>Pain that worsens during activity</li>
            <li>Pain that alters your biomechanics</li>
            <li>Swelling or redness</li>
            <li>Night pain that disrupts sleep</li>
          </ul>

          <h2>5. Invest in Proper Equipment</h2>
          <p>Appropriate shoes for your gait type, bike with correct bike fit and proper swimming equipment make a difference.</p>
        `
      }
    },
    "como-aumentar-potencia-no-pedal": {
      pt: {
        title: "Como Aumentar Potência no Pedal",
        category: "Ciclismo",
        readTime: "6 min",
        image: "/lovable-uploads/c2022b01-82d4-4894-b5f3-eba98aebfd4e.png",
        content: `
          <h2>Fundamentos da Potência no Ciclismo</h2>
          <p>Potência = Força × Cadência. Para melhorar watts, trabalhe ambos componentes de forma inteligente.</p>

          <h2>Treinos de Força Específicos</h2>
          <h3>1. Big Gear Intervals</h3>
          <p>Em terreno plano ou subida leve, pedale em marcha pesada (50-60 rpm) por 2-3 minutos. Foco em manter força consistente. 4-6 repetições com 3 min de recuperação.</p>

          <h3>2. Subidas Sentado</h3>
          <p>Encontre subida de 5-8% e suba sentado mantendo cadência 70-80 rpm. Desenvolve força de glúteos e quadríceps.</p>

          <h2>Treinos de Cadência Alta</h2>
          <h3>Spin-ups</h3>
          <p>Aumente gradualmente cadência até 110-120 rpm por 1-2 min. Melhora coordenação neuromuscular.</p>

          <h2>Intervalos de Potência (Sweet Spot)</h2>
          <p>Trabalhe 88-93% do FTP por 10-20 min. É a zona ideal para desenvolver potência sustentada.</p>
          <p><strong>Exemplo de treino:</strong><br>
          - Aquecimento: 15 min progressivo<br>
          - 3x 15 min @ Sweet Spot (5 min recuperação)<br>
          - Desaquecimento: 10 min fácil</p>

          <h2>Trabalho de Força na Academia</h2>
          <p>Complemente com agachamentos, leg press e levantamento terra. 2x por semana na off-season.</p>

          <h2>Nutrição e Recuperação</h2>
          <p>Potência exige energia. Carboidratos adequados antes/durante treinos intensos são essenciais.</p>
        `
      },
      en: {
        title: "How to Increase Cycling Power",
        category: "Cycling",
        readTime: "6 min",
        image: "/lovable-uploads/c2022b01-82d4-4894-b5f3-eba98aebfd4e.png",
        content: `
          <h2>Fundamentals of Cycling Power</h2>
          <p>Power = Force × Cadence. To improve watts, work both components intelligently.</p>

          <h2>Specific Strength Workouts</h2>
          <h3>1. Big Gear Intervals</h3>
          <p>On flat terrain or gentle climb, pedal in heavy gear (50-60 rpm) for 2-3 minutes. Focus on maintaining consistent force. 4-6 repetitions with 3 min recovery.</p>

          <h3>2. Seated Climbing</h3>
          <p>Find 5-8% climb and climb seated maintaining 70-80 rpm cadence. Develops glute and quad strength.</p>

          <h2>High Cadence Workouts</h2>
          <h3>Spin-ups</h3>
          <p>Gradually increase cadence to 110-120 rpm for 1-2 min. Improves neuromuscular coordination.</p>

          <h2>Power Intervals (Sweet Spot)</h2>
          <p>Work at 88-93% of FTP for 10-20 min. It's the ideal zone to develop sustained power.</p>
          <p><strong>Example workout:</strong><br>
          - Warm-up: 15 min progressive<br>
          - 3x 15 min @ Sweet Spot (5 min recovery)<br>
          - Cool-down: 10 min easy</p>

          <h2>Gym Strength Work</h2>
          <p>Supplement with squats, leg press and deadlifts. 2x per week in off-season.</p>

          <h2>Nutrition and Recovery</h2>
          <p>Power requires energy. Adequate carbs before/during intense workouts are essential.</p>
        `
      }
    },
    "como-evoluir-na-natacao": {
      pt: {
        title: "Como Evoluir na Natação",
        category: "Natação",
        readTime: "5 min",
        image: "/lovable-uploads/bg-1.png",
        content: `
          <h2>Técnica Antes de Volume</h2>
          <p>Na natação, técnica eficiente é mais importante que força bruta. Nadar com má técnica gasta energia e limita progressão.</p>

          <h2>Fundamentos Técnicos Essenciais</h2>
          
          <h3>1. Posição do Corpo</h3>
          <p>Corpo alinhado, horizontal na água. Olhe para baixo, não para frente. Quadril alto reduz resistência.</p>

          <h3>2. Pegada (Catch)</h3>
          <p>Estenda braço completamente, cotovelo alto, "segure" água à frente. Fase mais importante da braçada.</p>

          <h3>3. Rotação do Corpo</h3>
          <p>Gire tronco 30-45° a cada braçada. Isso aumenta alcance e potência enquanto reduz esforço de ombros.</p>

          <h3>4. Pernada Eficiente</h3>
          <p>Pernada vem do quadril, não do joelho. 2 ou 6 batidas por ciclo de braço. Tornozelos relaxados.</p>

          <h2>Treinos para Progressão</h2>
          
          <h3>Drill Work (30% do treino)</h3>
          <p>- Single arm drill<br>
          - Catch-up drill<br>
          - Fist swimming<br>
          - Zipper drill</p>

          <h3>Intervalados de Técnica</h3>
          <p>10x 50m @ 80% com foco em 1 aspecto técnico por série. Descanso 15-20s.</p>

          <h3>Endurance com Controle</h3>
          <p>Séries longas (400-800m) mantendo contagem de braçadas consistente.</p>

          <h2>Invista em Análise de Vídeo</h2>
          <p>Grave-se nadando e compare com nadadores de elite. Pequenos ajustes técnicos podem gerar grandes melhorias.</p>
        `
      },
      en: {
        title: "How to Progress in Swimming",
        category: "Swimming",
        readTime: "5 min",
        image: "/lovable-uploads/bg-1.png",
        content: `
          <h2>Technique Before Volume</h2>
          <p>In swimming, efficient technique is more important than brute strength. Swimming with poor technique wastes energy and limits progression.</p>

          <h2>Essential Technical Fundamentals</h2>
          
          <h3>1. Body Position</h3>
          <p>Aligned body, horizontal in water. Look down, not forward. High hips reduce drag.</p>

          <h3>2. Catch</h3>
          <p>Extend arm fully, high elbow, "catch" water in front. Most important phase of stroke.</p>

          <h3>3. Body Rotation</h3>
          <p>Rotate torso 30-45° each stroke. This increases reach and power while reducing shoulder strain.</p>

          <h3>4. Efficient Kick</h3>
          <p>Kick from hip, not knee. 2 or 6 beats per arm cycle. Relaxed ankles.</p>

          <h2>Progression Workouts</h2>
          
          <h3>Drill Work (30% of training)</h3>
          <p>- Single arm drill<br>
          - Catch-up drill<br>
          - Fist swimming<br>
          - Zipper drill</p>

          <h3>Technical Intervals</h3>
          <p>10x 50m @ 80% focusing on 1 technical aspect per set. Rest 15-20s.</p>

          <h3>Endurance with Control</h3>
          <p>Long sets (400-800m) maintaining consistent stroke count.</p>

          <h2>Invest in Video Analysis</h2>
          <p>Record yourself swimming and compare with elite swimmers. Small technical adjustments can yield big improvements.</p>
        `
      }
    }
  };

  const lang = t === t ? 'pt' : 'en';
  const article = slug ? articlesContent[slug]?.[lang] : null;

  if (!article) {
    navigate('/blog');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - Edgar Zanin</title>
        <meta name="description" content={article.content.substring(0, 160)} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <article className="container mx-auto px-4 md:px-6 max-w-4xl">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/blog')}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.blog.backToBlog}
            </Button>

            {article.image && (
              <img 
                src={article.image}
                alt={article.title}
                className="w-full h-[400px] object-cover rounded-lg mb-8"
              />
            )}

            <div className="flex items-center gap-3 mb-6">
              <Badge variant="secondary" className="font-semibold text-base">
                {article.category}
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{article.readTime}</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-8">
              {article.title}
            </h1>

            <div 
              className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <div className="mt-16 p-8 bg-primary/5 rounded-lg border border-primary/10">
              <h3 className="text-2xl font-display font-bold mb-4">
                Quer Levar Seu Treino ao Próximo Nível?
              </h3>
              <p className="text-muted-foreground mb-6">
                Entre em contato para treino personalizado focado nos seus objetivos específicos.
              </p>
              <Button size="lg" onClick={() => navigate('/#contact')}>
                Agende uma Consulta
              </Button>
            </div>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BlogArticlePage;