import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';

const ContactSection = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);

    toast({
      title: t.contact.form.success,
      description: t.contact.form.successDescription,
    });

    setFormData({
      name: '',
      email: '',
      message: ''
    });
  };

  return (
    <section id="contact" className="section bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.contact.title} <span className="text-brand-blue">{t.contact.titleHighlight}</span></h2>
          <div className="h-1 w-20 bg-brand-orange mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            {t.contact.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-6">{t.contact.info.title}</h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-brand-blue bg-opacity-10 p-3 rounded-full mr-4">
                  <Phone className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{t.contact.info.phone}</h4>
                  <p className="text-gray-700">+351 123 456 789</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-brand-blue bg-opacity-10 p-3 rounded-full mr-4">
                  <Mail className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{t.contact.info.email}</h4>
                  <p className="text-gray-700">edgar.zanin@example.com</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-brand-blue bg-opacity-10 p-3 rounded-full mr-4">
                  <MapPin className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{t.contact.info.location}</h4>
                  <p className="text-gray-700">Porto, Portugal</p>
                  <p className="text-gray-600 text-sm mt-1">{t.contact.info.locationDesc}</p>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">{t.contact.hours.title}</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">{t.contact.hours.weekdays}</h4>
                    <p className="text-gray-700">6:00 AM - 8:00 PM</p>
                  </div>
                  <div>
                    <h4 className="font-medium">{t.contact.hours.weekends}</h4>
                    <p className="text-gray-700">8:00 AM - 2:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-6">{t.contact.form.title}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t.contact.form.name}</label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t.contact.form.namePlaceholder}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t.contact.form.email}</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={t.contact.form.emailPlaceholder}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">{t.contact.form.message}</label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder={t.contact.form.messagePlaceholder}
                  className="w-full min-h-[150px]"
                />
              </div>
              <Button type="submit" className="w-full bg-brand-blue hover:bg-blue-600">
                <Send className="h-4 w-4 mr-2" />
                {t.contact.form.send}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
