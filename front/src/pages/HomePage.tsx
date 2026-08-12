import { Link } from "react-router-dom";

export default function HomePage() {
  const moduleList = [
    {
      id: 1,
      title: "Tableau de bord",
      img: {
        url: "/assets/dashboard-wallpaper.jpg",
        width: 3000,
        height: 2000,
      },
      link: "/dashboard",
    },
    {
      id: 2,
      title: "Statistiques",
      img: {
        url: "/assets/statistiques-wallpaper.png",
        width: 2816,
        height: 1536,
      },
      link: "/statistiques",
    },
    {
      id: 4,
      title: "Notes",
      img: {
        url: "/assets/notes-wallpaper.png",
        width: 2560,
        height: 1664,
      },
      link: "/notes",
    },
    {
      id: 3,
      title: "Vidéos automatisées",
      img: {
        url: "/assets/videos-automatisees-wallpaper.png",
        width: 3000,
        height: 2000,
      },
      link: "/video-automatisation",
    },
    {
      id: 6,
      title: "Éditeur de clips",
      img: {
        url: "/assets/videos-automatisees-wallpaper.png",
        width: 3000,
        height: 2000,
      },
      link: "/editeur-clips",
    },
    {
      id: 5,
      title: "Chatbox IA",
      img: {
        url: "/assets/chatbox-ia-wallpaper.jpg",
        width: 3000,
        height: 2000,
      },
      link: "/chatbox-ia",
    },
  ];

  return (
    <>
      <title>Accueil - QG10banc</title>
      <div className="pt-32 md:pt-36 h-dvh overflow-hidden">
        <div className="bg-background-secondary flex lg:grid lg:grid-cols-3 flex-col gap-4 xl:gap-6 p-4 xl:p-6 rounded-3xl max-h-full lg:h-[95%] overflow-auto scrollbar-thin">
          {moduleList.map((module) => (
            <Link
              to={module.link}
              className={`relative rounded-2xl overflow-hidden min-h-[200px] sm:min-h-[250px] hover:scale-[101%] active:scale-95 hover:outline-2 active:outline-2 outline-main-color transition-transform ${
                module.id === 1 && "row-span-2"
              }`}
              key={module.id}
            >
              <h2
                className={`absolute z-10 top-1/2 left-1/2 -translate-1/2 text-2xl sm:text-3xl 2xl:text-4xl  ${
                  module.id === 3
                    ? "whitespace-normal text-center leading-10 2xl:leading-12 2xl:whitespace-nowrap"
                    : "whitespace-nowrap"
                } uppercase`}
              >
                {module.title}
              </h2>
              <div className="w-full h-full bg-black/70 absolute"></div>
              <img
                src={module.img.url}
                width={module.img.width}
                height={module.img.height}
                className={`object-cover h-full ${
                  module.id === 5 && "object-top"
                }`}
              />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
