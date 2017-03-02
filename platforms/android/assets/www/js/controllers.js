'use strict';
var app = angular.module('starter.controllers', []);

app.controller('MenuCtrl', function ($scope, HorariosService, $state) {
  $scope.abreMapa = function () {
    HorariosService.setNumPredio(null);
    $state.go('app.mapa');
  };
  $scope.menuHorariosClick = function () {
    $state.go('app.horarios');
  };
});

/*Controller do Mapa: Inicializa serviço de sobreposição de imagem, serviço de geolocalização, marcadores,
 *o mapa e suas configurações gerais de inicialização (centralização, zoom, tipo de mapa, etc.)*/
app.controller('MapCtrl', function ($scope, HorariosService, MapaService, OverlayService) {
  var overlay = OverlayService.getHistoricalOverlay();
  var iniciar = function () {
    var mapOptions = {
      center: new google.maps.LatLng(-28.7040281, -49.4073988),
      zoom: 17,
      minZoom:16,
      maxZoom:20,
      mapTypeId: google.maps.MapTypeId.ROADMAP, //ROADMAP, SATELLITE OU HYBRID
      streetViewControl: false,
      mapTypeControl: false
    };
    var map = new google.maps.Map(document.getElementById('map'), mapOptions);
    var displayAndWatch;

    //OverlayService.removeOverlay();
    //Inicia a imagem que irá sobrepor o mapa
    overlay.setMap(map);

    var arrayPredios = MapaService.getPredios();

    //Percorre o array de predios e retorna apenas o que foi selecionado.
    function getPredioPorNumero(numeroPredio) {
      for (var i = 0; i < arrayPredios.length; i++) {
        if (arrayPredios[i].numero === numeroPredio) {
          return arrayPredios[i];
        }
      }
    }

    /*Trata o erro se o caso o usuário vá direto da página Home para Mapa (número do prédio indefinido(null))
     * e inicializa o marcador do prédio caso não seja nulo*/
    if (HorariosService.getNumPredio() !== null) {
      var iconPredio = 'img/numbers/number_' + getPredioPorNumero(HorariosService.getNumPredio()).numero + '.png';
      var predio = new google.maps.Marker({
        position: new google.maps.LatLng(getPredioPorNumero(HorariosService.getNumPredio()).lat, getPredioPorNumero(HorariosService.getNumPredio()).lng),
        icon: iconPredio,
        animation: google.maps.Animation.BOUNCE
      });
      predio.setMap(map);
    }

    //Marcadores
    MapaService.getCc().setMap(map);
    MapaService.getRefeitorio1().setMap(map);
    MapaService.getRefeitorio2().setMap(map);
    MapaService.getQuadra().setMap(map);
    MapaService.getCampo().setMap(map);
    MapaService.getBiblioteca().setMap(map);
    MapaService.getQuadraBasquete().setMap(map);


    //Define até onde se pode carregar o mapa (bounderies)
    var strictBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(-28.706995, -49.410373),
      new google.maps.LatLng(-28.700323,  -49.404246));

    // Listener para a função de arrastar o mapa
    google.maps.event.addListener(map, 'dragend', function () {
      if (strictBounds.contains(map.getCenter())) return;

      // Caso saia dos limites, traz a visualização de volta aos limites
      var c = map.getCenter(),
        x = c.lng(),
        y = c.lat(),
        maxX = strictBounds.getNorthEast().lng(),
        maxY = strictBounds.getNorthEast().lat(),
        minX = strictBounds.getSouthWest().lng(),
        minY = strictBounds.getSouthWest().lat();

      if (x < minX) x = minX;
      if (x > maxX) x = maxX;
      if (y < minY) y = minY;
      if (y > maxY) y = maxY;

      map.setCenter(new google.maps.LatLng(y, x));
    });



    //Geolocalização : gera um marcador na posição atual do dispositivo
    if (navigator.geolocation) {
      var posicaoAtual;
      var positionTimer;

      //calcula a posição atual do dispositivo
      var setCurrentPosition = function (pos) {
        posicaoAtual = new google.maps.Marker({
          map: map,
          position: new google.maps.LatLng(
            pos.coords.latitude,
            pos.coords.longitude
          ),
          title: 'Current Position',
          icon: '../img/seta2.png'
        });
      };

      //define (seta) a posição atual do marcador
      var setMarkerPosition = function (marker, position) {
        marker.setPosition(
          new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude)
        );
      };

      //atualiza a posição do marcador
      var watchCurrentPosition = function () {
        positionTimer = navigator.geolocation.watchPosition(
          function (position) {
            setMarkerPosition(
              posicaoAtual,
              position
            );
          });
      };

      displayAndWatch = function (position) {
        // set current position
        setCurrentPosition(position);
        // watch position
        watchCurrentPosition();
      };
    }

    //Erro caso não seja possível encontrar a posição do dispositivo
    //Pode ser gerado quando o usuário deixa a localização do dispositivo desabilitada
    function GEO_ERROR() {

    }

    //Opções da geolocalização (precisão e tempo máximo de espera da resposta)
    var GEO_OPTIONS = {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 27000
    };
    navigator.geolocation.getCurrentPosition(displayAndWatch, GEO_ERROR, GEO_OPTIONS);

    $scope.map = map;
  };
  if (document.readyState === 'complete') {
    iniciar();
  } else {
    google.maps.event.addDomListener(window, 'load', iniciar);
  }
});

/*Gera a lista de cursos e pega o número do prédio escolhido pelo usuário para ser utilizado
 * na MapCtrl (Controller do mapa).
 * Caso o botão 'Encontrar no mapa' da página horários seja apertado, vai para a página mapa com o número do prédio já definido*/
app.controller('HorariosCtrl', function ($scope, $state, HorariosService, CursosService, GeolocationService, $ionicPopup /*, $http*/) {
  $scope.cursos = CursosService.getCursos();
  $scope.encontraPredio = function (numPredio) {
    /*if (!GeolocationService.getGeolocation()) {
     var confirmaLocalizacao = $ionicPopup.confirm({
     title: 'Ativar Localização',
     template: 'A localização ativada proporciona um melhor desempenho do aplicativo ao usuário. Deseja ativar a localização do dispositivo?',
     });
     confirmaLocalizacao.then(function(res) {
     if (res) { cordova.plugins.diagnostic.switchToLocationSettings(); } else {}
     });
     }*/
    if (window.cordova) {
      cordova.plugins.diagnostic.isLocationEnabled(function (enabled) {
        //$scope.locationConfirm = function() {

        if (!enabled) {
          var confirmaLocalizacao = $ionicPopup.confirm({
            title: 'Ativar Localização',
            template: 'A localização ativada proporciona um melhor desempenho do aplicativo ao usuário. Deseja ativar a localização do dispositivo?',
          });
          confirmaLocalizacao.then(function (res) {
            if (res) {
              cordova.plugins.diagnostic.switchToLocationSettings();
            } else {
            }
          });
        }
        //};
        console.log("Location is " + (enabled ? "enabled" : "disabled"));
      }, function (error) {
        console.error("The following error occurred: " + error);
      });
    }
    HorariosService.setNumPredio(numPredio);
    $state.go('app.mapa');
  };

});

/*Gera a lista de predios e pega o número do prédio escolhido pelo usuário para ser utilizado
 * na MapCtrl (Controller do mapa)
 * Caso o botão 'Encontrar no mapa' da página home seja apertado, vai para a página mapa com o número do prédio já definido*/
app.controller('HomeCtrl', function ($scope, MapaService, HorariosService, $state, GeolocationService, $ionicPopup) {

  $scope.predios = MapaService.getPredios();
  $scope.homeEncontraPredio = function (numPredio) {
    if (window.cordova) {
      cordova.plugins.diagnostic.isLocationEnabled(function (enabled) {
        //$scope.locationConfirm = function() {

        if (!enabled) {
          var confirmaLocalizacao = $ionicPopup.confirm({
            title: 'Ativar Localização',
            template: 'A localização ativada proporciona um melhor desempenho do aplicativo ao usuário. Deseja ativar a localização do dispositivo?',
          });
          confirmaLocalizacao.then(function (res) {
            if (res) {
              cordova.plugins.diagnostic.switchToLocationSettings();
            } else {
            }
          });
        }
        //};
        console.log("Location is " + (enabled ? "enabled" : "disabled"));
      }, function (error) {
        console.error("The following error occurred: " + error);
      });
    }
    /*if (!GeolocationService.getGeolocation()) {
     var confirmaLocalizacao = $ionicPopup.confirm({
     title: 'Ativar Localização',
     template: 'A localização ativada proporciona um melhor desempenho do aplicativo ao usuário. Deseja ativar a localização do dispositivo?',
     });
     confirmaLocalizacao.then(function(res) {
     if (res) { cordova.plugins.diagnostic.switchToLocationSettings(); } else {}
     });
     }*/
    HorariosService.setNumPredio(numPredio);
    $state.go('app.mapa');
  };
});

app.controller('DashCtrl', function($scope) {

  var deploy = new Ionic.Deploy();

  // Update app code with new release from Ionic Deploy
  $scope.doUpdate = function() {
    deploy.update().then(function(res) {
      console.log('Ionic Deploy: Update Success! ', res);
    }, function(err) {
      console.log('Ionic Deploy: Update error! ', err);
    }, function(prog) {
      console.log('Ionic Deploy: Progress... ', prog);
    });
  };

  // Check Ionic Deploy for new code
  $scope.checkForUpdates = function() {
    console.log('Ionic Deploy: Checking for updates');
    deploy.check().then(function(hasUpdate) {
      console.log('Ionic Deploy: Update available: ' + hasUpdate);
      $scope.hasUpdate = hasUpdate;
    }, function(err) {
      console.error('Ionic Deploy: Unable to check for updates', err);
    });
  }

});
/*
 if (window.cordova) {
 cordova.plugins.diagnostic.isLocationEnabled(function(enabled) {
 console.log('success' + enabled);
 }, function(error) {
 console.log('error', +error);
 });
 }*/
