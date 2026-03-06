import { Star, Quote } from 'lucide-react';

interface Review {
  name: string;
  title?: string;
  rating: number;
  text: string;
}

const reviews: Review[] = [
  {
    name: 'Michelle Williams',
    title: 'Local Guide',
    rating: 5,
    text: 'Great and friendly service, the quality of their product is top notch.',
  },
  {
    name: 'Orrin Naylor',
    rating: 5,
    text: 'Nice people.',
  },
  {
    name: 'Brad Timpson',
    rating: 5,
    text: '',
  },
];

export default function Reviews() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-slate-600 text-lg">
            Trusted by local homeowners for over a decade.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {review.text && (
                <div className="mb-6">
                  <Quote className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-slate-700 text-lg leading-relaxed">
                    {review.text}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <p className="font-semibold text-slate-900">{review.name}</p>
                {review.title && (
                  <p className="text-sm text-slate-500">{review.title}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 rounded-full">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-slate-700 font-medium">5.0 Average Rating</span>
          </div>
        </div>
      </div>
    </section>
  );
}
